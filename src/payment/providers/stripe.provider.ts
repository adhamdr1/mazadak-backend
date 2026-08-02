import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentProvider,
  CreatePaymentData,
  PaymentCreationResult,
  RefundPaymentData,
  PaymentStatusResult,
} from '../interfaces/payment-provider.interface';
import { PaymentStatus } from '../enums/payment-status.enum';
import Stripe from 'stripe';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: Stripe;
  private endpointSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_mock',
      {
        apiVersion:
          '2024-06-20' as unknown as Stripe.StripeConfig['apiVersion'],
      },
    );
    this.endpointSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || 'whsec_mock';
  }

  async createPayment(data: CreatePaymentData): Promise<PaymentCreationResult> {
    try {
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
    try {
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
    try {
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
    try {
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
}
