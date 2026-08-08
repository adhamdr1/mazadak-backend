import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentProvider,
  CreatePaymentData,
  PaymentCreationResult,
  RefundPaymentData,
  PaymentStatusResult,
  ExtractedWebhookData,
} from '../interfaces/payment-provider.interface';
import { PaymentStatus } from '../enums/payment-status.enum';
import { StripeWebhookEvent } from '../constants/webhook-event-constants';
import Stripe from 'stripe';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: Stripe | null = null;
  private endpointSecret: string;
  private readonly isMock: boolean;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.isMock = secret === 'sk_test_mock';

    if (!this.isMock) {
      this.stripe = new Stripe(secret, {
        apiVersion: Stripe.API_VERSION,
      });
    }

    this.endpointSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  async createPayment(data: CreatePaymentData): Promise<PaymentCreationResult> {
    if (this.isMock) {
      this.logger.log('Mocking Stripe PaymentIntent creation for testing...');
      const mockIntentId = 'pi_mock_' + Math.floor(Math.random() * 100000);
      const mockClientSecret = `${mockIntentId}_secret_${Date.now()}`;
      return {
        gatewayPaymentIntentId: mockIntentId,
        clientSecret: mockClientSecret,
        paymentUrl: null,
      };
    }

    try {
      if (!this.stripe) {
        throw new Error('Stripe client is not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: data.amount,
          currency: data.currency.toLowerCase(),
          metadata: data.metadata,
          receipt_email: data.email,
        },
        {
          idempotencyKey: data.idempotencyKey,
        },
      );

      return {
        gatewayPaymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        paymentUrl: null,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to create Stripe PaymentIntent: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret?: string,
  ): boolean {
    if (this.isMock || this.endpointSecret === 'whsec_mock') {
      this.logger.log(
        'Bypassing Stripe signature verification for mock testing...',
      );
      return true;
    }

    try {
      if (!this.stripe) {
        throw new Error('Stripe client is not initialized');
      }

      const webhookSecret = secret || this.endpointSecret;
      this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Stripe Webhook Signature Verification Failed: ${err.message}`,
      );
      return false;
    }
  }

  async refund(data: RefundPaymentData): Promise<void> {
    if (this.isMock) {
      this.logger.log(
        `Mocking Stripe refund for PaymentIntent ${data.gatewayPaymentIntentId} with amount ${data.amount}`,
      );
      return;
    }

    try {
      if (!this.stripe) {
        throw new Error('Stripe client is not initialized');
      }

      await this.stripe.refunds.create({
        payment_intent: data.gatewayPaymentIntentId,
        amount: data.amount,
        reason: data.reason as Stripe.RefundCreateParams.Reason,
      });
      this.logger.log(
        `Successfully refunded Stripe PaymentIntent ${data.gatewayPaymentIntentId} with amount ${data.amount}`,
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to refund Stripe PaymentIntent: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  async getPaymentStatus(
    gatewayPaymentIntentId: string,
  ): Promise<PaymentStatusResult> {
    if (this.isMock) {
      this.logger.log(
        `Mocking Stripe getPaymentStatus for: ${gatewayPaymentIntentId}`,
      );
      return {
        status: PaymentStatus.SUCCESS,
        gatewayTransactionId: 'ch_mock_' + gatewayPaymentIntentId.split('_')[2],
      };
    }

    try {
      if (!this.stripe) {
        throw new Error('Stripe client is not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        gatewayPaymentIntentId,
      );

      let status = PaymentStatus.PENDING;
      if (paymentIntent.status === 'succeeded') {
        status = PaymentStatus.SUCCESS;
      } else if (
        paymentIntent.status === 'canceled' ||
        paymentIntent.status === 'requires_payment_method'
      ) {
        status = PaymentStatus.FAILED;
      }

      // Find successful charge ID if it exists
      let chargeId: string | undefined;
      if (typeof paymentIntent.latest_charge === 'string') {
        chargeId = paymentIntent.latest_charge;
      } else if (
        paymentIntent.latest_charge &&
        typeof paymentIntent.latest_charge === 'object'
      ) {
        chargeId = paymentIntent.latest_charge.id;
      }

      return {
        status,
        gatewayTransactionId: chargeId,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to retrieve Stripe PaymentIntent status: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  extractWebhookData(payload: Record<string, unknown>): ExtractedWebhookData {
    const stripePayload = payload as {
      type?: string;
      data?: {
        object?: {
          metadata?: { transactionId?: string };
          amount?: number;
          currency?: string;
        };
      };
    };

    const eventType = stripePayload.type;
    const dataObj = stripePayload.data?.object;
    const transactionId = dataObj?.metadata?.transactionId;
    const isSuccess = eventType === StripeWebhookEvent.PaymentIntentSucceeded;
    const amountMinorUnits = Number(dataObj?.amount || 0);
    const rawCurrency = dataObj?.currency;
    const currency = String(rawCurrency || 'EGP').toUpperCase();

    return {
      transactionId,
      isSuccess,
      amountMinorUnits,
      currency,
    };
  }
}
