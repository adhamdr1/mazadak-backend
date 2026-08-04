import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
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
import axios from 'axios';
import * as crypto from 'crypto';

interface PaymobAuthResponse {
  token: string;
}

interface PaymobOrderResponse {
  id: number;
}

interface PaymobPaymentKeyResponse {
  token: string;
}

interface PaymobWebhookPayload {
  obj: {
    id: number;
    amount_cents: number;
    created_at: string;
    currency: string;
    error_occured: boolean;
    has_parent_transaction: boolean;
    integration_id: number;
    is_3d_secure: boolean;
    is_auth: boolean;
    is_capture: boolean;
    is_refunded: boolean;
    is_standalone_payment: boolean;
    is_voided: boolean;
    order?: { id: number };
    owner: number;
    pending: boolean;
    source_data?: { pan?: string; sub_type?: string; type?: string };
    success: boolean;
  };
}
@Injectable()
export class PaymobProvider implements IPaymentProvider {
  private readonly logger = new Logger(PaymobProvider.name);
  private readonly hmacSecret: string;
  private readonly apiKey: string;
  private readonly integrationId: number;
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.hmacSecret =
      this.configService.get<string>('PAYMOB_HMAC_SECRET') || 'hmac_mock';
    this.apiKey =
      this.configService.get<string>('PAYMOB_API_KEY') || 'api_mock';
    this.integrationId =
      this.configService.get<number>('PAYMOB_INTEGRATION_ID') || 12345;
    this.apiBaseUrl =
      this.configService.get<string>('PAYMOB_API_BASE_URL') ||
      'https://accept.paymob.com/api';
  }

  async createPayment(data: CreatePaymentData): Promise<PaymentCreationResult> {
    try {
      const token = await this.getAuthToken();

      // 2. Register Order
      const orderResponse = await axios.post<PaymobOrderResponse>(
        `${this.apiBaseUrl}/ecommerce/orders`,
        {
          auth_token: token,
          delivery_needed: 'false',
          amount_cents: data.amount,
          currency: data.currency.toUpperCase(),
          merchant_order_id: data.idempotencyKey,
        },
      );
      const orderId = orderResponse.data.id;

      // 3. Get Payment Key
      const paymentKeyResponse = await axios.post<PaymobPaymentKeyResponse>(
        `${this.apiBaseUrl}/acceptance/payment_keys`,
        {
          auth_token: token,
          amount_cents: data.amount,
          expiration: 3600,
          order_id: orderId,
          billing_data: {
            apartment: 'NA',
            email: data.email || 'dummy@mazadak.com',
            floor: 'NA',
            first_name: data.firstName || 'NA',
            street: 'NA',
            building: 'NA',
            phone_number: data.phone || 'NA',
            shipping_method: 'NA',
            postal_code: 'NA',
            city: 'NA',
            country: 'NA',
            last_name: data.lastName || 'NA',
            state: 'NA',
          },
          currency: data.currency.toUpperCase(),
          integration_id: this.integrationId,
        },
      );

      const paymentToken = paymentKeyResponse.data.token;
      const iframeId =
        this.configService.get<string>('PAYMOB_IFRAME_ID') || '1234';

      return {
        gatewayPaymentIntentId: orderId.toString(),
        clientSecret: paymentToken,
        paymentUrl: `${this.apiBaseUrl}/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to create Paymob payment: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Payment creation failed');
    }
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret?: string,
  ): boolean {
    try {
      const body = JSON.parse(rawBody.toString()) as PaymobWebhookPayload;
      const obj = body.obj;
      if (!obj) return false;

      const concatenatedString = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order?.id,
        obj.owner,
        obj.pending,
        obj.source_data?.pan,
        obj.source_data?.sub_type,
        obj.source_data?.type,
        obj.success,
      ].join('');

      const hmac = crypto.createHmac('sha512', secret || this.hmacSecret);
      hmac.update(concatenatedString);
      const calculatedHmac = hmac.digest('hex');

      return calculatedHmac === signature;
    } catch (error: unknown) {
      this.logger.error(
        `Paymob Webhook Signature Verification Failed: ${String(error)}`,
      );
      return false;
    }
  }

  private async getAuthToken(): Promise<string> {
    const authResponse = await axios.post<PaymobAuthResponse>(
      `${this.apiBaseUrl}/auth/tokens`,
      {
        api_key: this.apiKey,
      },
    );
    return authResponse.data.token;
  }

  async refund(data: RefundPaymentData): Promise<void> {
    try {
      const token = await this.getAuthToken();
      await axios.post(`${this.apiBaseUrl}/acceptance/void_refund/refund`, {
        auth_token: token,
        transaction_id: Number(data.gatewayPaymentIntentId),
        amount_cents: data.amount,
      });
      this.logger.log(
        `Successfully refunded Paymob transaction ${data.gatewayPaymentIntentId} with amount ${data.amount}`,
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to refund Paymob payment: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  async getPaymentStatus(
    gatewayPaymentIntentId: string,
  ): Promise<PaymentStatusResult> {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get<{
        paid_amount_cents: number;
        is_voided: boolean;
      }>(`${this.apiBaseUrl}/ecommerce/orders/${gatewayPaymentIntentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const order = response.data;
      let status = PaymentStatus.PENDING;
      if (order.paid_amount_cents > 0) {
        status = PaymentStatus.SUCCESS;
      } else if (order.is_voided) {
        status = PaymentStatus.FAILED;
      }

      return {
        status,
        gatewayTransactionId: gatewayPaymentIntentId,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to retrieve Paymob order status: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  extractWebhookData(payload: Record<string, unknown>): ExtractedWebhookData {
    const paymobPayload = payload as {
      obj?: {
        order?: { merchant_order_id?: string };
        merchant_order_id?: string;
        success?: boolean | string;
        amount_cents?: number;
        currency?: string;
      };
    };
    const obj = paymobPayload.obj;
    const transactionId =
      obj?.order?.merchant_order_id ?? obj?.merchant_order_id;
    const success = obj?.success;
    const isSuccess = success === true || success === 'true';
    const amountMinorUnits = Number(obj?.amount_cents || 0);
    const rawCurrency = obj?.currency;
    const currency = String(rawCurrency || 'EGP').toUpperCase();

    return {
      transactionId,
      isSuccess,
      amountMinorUnits,
      currency,
    };
  }
}
