import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  RabbitMQEvent,
  PaymentWebhookReceivedPayload,
} from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentProviderType } from './enums/payment-provider-type.enum';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { TransactionService } from '../transaction/transaction.service';
import { WalletService } from '../wallet/wallet.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentInitResult } from './dto/payment-init-result.type';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { randomUUID } from 'crypto';
import { type IWebhookEventRepository } from './interfaces/webhook-event.repository.interface';
import { WebhookSignatureVerificationFailedException } from './exceptions/webhook-signature-verification-failed.exception';
import { StripeWebhookEvent } from './constants/webhook-event-constants';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject('IWebhookEventRepository')
    private readonly webhookEventRepository: IWebhookEventRepository,
    @InjectConnection() private readonly connection: Connection,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly transactionService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
  ) {}

  async handleWebhook(
    providerType: PaymentProviderType,
    rawBody: Buffer,
    signature: string,
    providerEventId: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const provider = this.providerFactory.getProvider(providerType);

    // 1. Verify Signature
    const isValid = provider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.error(
        `Invalid webhook signature for provider: ${providerType}`,
      );
      throw new WebhookSignatureVerificationFailedException();
    }

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      // 2. Idempotency Check using providerEventId
      const existingEvent = await this.webhookEventRepository.findOne(
        providerEventId,
        session,
      );
      if (existingEvent) {
        this.logger.log(
          `Webhook event ${providerEventId} already exists. Skipping.`,
        );
        await session.commitTransaction();
        return;
      }

      // 3. Save to Inbox (WebhookEvent)
      await this.webhookEventRepository.create(
        {
          providerEventId,
          provider: providerType,
          payload,
          providerSignature: signature,
          processed: false,
        },
        session,
      );

      // 4. Save to Outbox for dispatching via worker
      await this.outboxService.saveEvent(
        RabbitMQEvent.PaymentWebhookReceived,
        {
          providerEventId,
          provider: providerType,
          payload,
        },
        session,
        providerEventId,
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async processPaymentWebhookEvent(
    event: PaymentWebhookReceivedPayload,
  ): Promise<void> {
    const { providerEventId, provider, payload } = event;

    const webhookEvent =
      await this.webhookEventRepository.findOne(providerEventId);
    if (!webhookEvent) {
      this.logger.error(
        `Webhook event ${providerEventId} not found in database.`,
      );
      return;
    }

    if (webhookEvent.processed) {
      this.logger.log(
        `Webhook event ${providerEventId} is already processed. Skipping.`,
      );
      return;
    }

    // We start a Mongoose transaction to ensure atomicity
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      // Extract transaction ID from payload based on provider
      let internalTransactionId: string | undefined;
      let isSuccess = false;
      let webhookAmount = 0;
      let webhookCurrency = 'EGP';

      if ((provider as PaymentProviderType) === PaymentProviderType.STRIPE) {
        const stripePayload = payload as {
          data?: {
            object?: {
              metadata?: { transactionId?: string };
              amount?: number;
              currency?: string;
            };
          };
          type?: string;
        };
        internalTransactionId =
          stripePayload.data?.object?.metadata?.transactionId;
        isSuccess =
          stripePayload.type === StripeWebhookEvent.PaymentIntentSucceeded;
        webhookAmount = Number(stripePayload.data?.object?.amount || 0);

        const rawCurrency = stripePayload.data?.object?.currency;
        webhookCurrency = String(rawCurrency || 'EGP').toUpperCase();
      } else if (
        (provider as PaymentProviderType) === PaymentProviderType.PAYMOB
      ) {
        const paymobPayload = payload as {
          obj?: {
            order?: { merchant_order_id?: string };
            success?: boolean;
            amount_cents?: number;
            currency?: string;
          };
        };
        internalTransactionId = paymobPayload.obj?.order?.merchant_order_id;
        isSuccess = paymobPayload.obj?.success === true;
        webhookAmount = Number(paymobPayload.obj?.amount_cents || 0);

        const rawCurrency = paymobPayload.obj?.currency;
        webhookCurrency = String(rawCurrency || 'EGP').toUpperCase();
      }

      if (!internalTransactionId) {
        this.logger.warn(
          `Could not extract internalTransactionId for webhook ${providerEventId}`,
        );
        // Mark as processed anyway so we don't retry a bad payload infinitely
      } else {
        await this.transactionService.updateTransactionStatusAndEmitOutbox(
          internalTransactionId,
          isSuccess ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
          webhookAmount,
          webhookCurrency,
          this.outboxService,
          session,
        );
        this.logger.log(
          `Extracted TransactionId: ${internalTransactionId}, status: ${isSuccess ? TransactionStatus.SUCCESS : TransactionStatus.FAILED}`,
        );
      }

      webhookEvent.processed = true;
      webhookEvent.processedAt = new Date();
      await this.webhookEventRepository.save(webhookEvent, session);

      await session.commitTransaction();
      this.logger.log(
        `Successfully processed webhook event ${providerEventId}`,
      );
    } catch (error: unknown) {
      await session.abortTransaction();
      const err = error as Error;
      this.logger.error(
        `Failed to process webhook event ${providerEventId}`,
        err.stack,
      );

      // Update retry count and error message outside the transaction
      webhookEvent.retryCount += 1;
      webhookEvent.errorMessage = err.message;
      await this.webhookEventRepository.save(webhookEvent);

      throw err;
    } finally {
      await session.endSession();
    }
  }

  async initializePayment(
    userId: string,
    data: InitializePaymentDto,
  ): Promise<PaymentInitResult> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const idempotencyKey = randomUUID();

      const wallet = await this.walletService.getWalletByUserId(userId);
      const user = await this.usersService.findById(userId);

      const provider = this.providerFactory.getProvider(data.provider);
      const gatewayResult = await provider.createPayment({
        amount: data.amount,
        currency: data.currency,
        idempotencyKey,
        metadata: {
          userId,
          walletId: wallet._id.toString(),
        },
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
      });

      await this.transactionService.createTransaction(
        {
          walletId: wallet._id.toString(),
          type: TransactionType.DEPOSIT,
          amount: data.amount / 100, // convert minor units to major units
          currency: data.currency,
          status: TransactionStatus.PENDING,
          idempotencyKey,
          gatewayPaymentIntentId: gatewayResult.gatewayPaymentIntentId,
          gatewayProvider: data.provider,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
        },
        session,
      );

      await session.commitTransaction();

      return {
        gatewayPaymentIntentId: gatewayResult.gatewayPaymentIntentId,
        clientSecret: gatewayResult.clientSecret,
        paymentUrl: gatewayResult.paymentUrl,
        idempotencyKey,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
