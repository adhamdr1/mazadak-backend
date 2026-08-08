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
import { UsersService } from '../users/users.service';
import Decimal from 'decimal.js';
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
      const paymentProvider = this.providerFactory.getProvider(
        provider as PaymentProviderType,
      );

      const {
        transactionId: internalTransactionId,
        isSuccess,
        amountMinorUnits: webhookAmount,
        currency: webhookCurrency,
      } = paymentProvider.extractWebhookData(payload);

      if (!internalTransactionId) {
        this.logger.warn(
          `Could not extract internalTransactionId for webhook ${providerEventId}`,
        );
        // Mark as processed anyway so we don't retry a bad payload infinitely
      } else if (webhookCurrency?.toUpperCase() !== 'EGP') {
        this.logger.error(
          `Unsupported currency received in webhook ${providerEventId}: ${webhookCurrency}`,
        );
        // Mark as processed anyway so we don't retry a bad payload infinitely
      } else {
        await this.transactionService.updateTransactionStatusAndEmitOutbox(
          internalTransactionId,
          isSuccess ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
          webhookAmount,
          webhookCurrency,
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

      // Re-fetch fresh webhookEvent from DB outside session to clear any in-memory mutations from the aborted session
      const freshWebhookEvent =
        await this.webhookEventRepository.findOne(providerEventId);
      if (freshWebhookEvent) {
        freshWebhookEvent.retryCount += 1;
        freshWebhookEvent.errorMessage = err.message;
        await this.webhookEventRepository.save(freshWebhookEvent);
      }

      throw err;
    } finally {
      await session.endSession();
    }
  }

  async initializePayment(
    userId: string,
    data: InitializePaymentDto,
  ): Promise<PaymentInitResult> {
    const idempotencyKey = randomUUID();

    const wallet = await this.walletService.getWalletByUserId(userId);
    const user = await this.usersService.findById(userId);

    // 1. Create PENDING transaction in DB first
    const transaction = await this.transactionService.createTransaction({
      walletId: wallet._id.toString(),
      type: TransactionType.DEPOSIT,
      amount: new Decimal(data.amount).div(100).toNumber(), // convert minor units to major units
      currency: data.currency || 'EGP',
      status: TransactionStatus.PENDING,
      idempotencyKey,
      gatewayProvider: data.provider,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
    });

    const transactionId = transaction._id.toString();

    // 2. Call external payment provider outside DB transaction
    try {
      const provider = this.providerFactory.getProvider(data.provider);
      const gatewayResult = await provider.createPayment({
        amount: data.amount,
        currency: data.currency || 'EGP',
        idempotencyKey,
        metadata: {
          userId,
          walletId: wallet._id.toString(),
          transactionId,
        },
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
      });

      // 3. Attach gatewayPaymentIntentId to the transaction record
      await this.transactionService.updateGatewayPaymentIntentId(
        transactionId,
        gatewayResult.gatewayPaymentIntentId,
      );

      return {
        gatewayPaymentIntentId: gatewayResult.gatewayPaymentIntentId,
        clientSecret: gatewayResult.clientSecret,
        paymentUrl: gatewayResult.paymentUrl,
        idempotencyKey,
      };
    } catch (err) {
      this.logger.error(
        `Failed to create gateway payment for transaction ${transactionId}: ${err instanceof Error ? err.message : String(err)}`,
      );

      await this.transactionService
        .createTransaction({
          walletId: wallet._id.toString(),
          type: TransactionType.DEPOSIT,
          amount: new Decimal(data.amount).div(100).toNumber(),
          currency: data.currency,
          status: TransactionStatus.FAILED,
          referenceId: transactionId,
          idempotencyKey,
          gatewayProvider: data.provider,
        })
        .catch((createErr) => {
          this.logger.error(
            `Failed to record FAILED status transition for transaction ${transactionId}: ${createErr instanceof Error ? createErr.message : String(createErr)}`,
          );
        });

      throw err;
    }
  }
}
