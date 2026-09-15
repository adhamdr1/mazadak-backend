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

interface PaymobIntentionResponse {
  client_secret: string;
  id?: number | string;
  intention_order_id?: number | string;
  payment_keys?: Array<{
    key: string;
    gateway_type: string;
    integration_id: number;
  }>;
}

interface PaymobWebhookPayload {
  type?: string;
  special_reference?: string;
  obj?: {
    id: number | string;
    amount_cents: number;
    created_at: string;
    currency: string;
    error_occured?: boolean;
    has_parent_transaction?: boolean;
    integration_id?: number;
    is_3d_secure?: boolean;
    is_auth?: boolean;
    is_capture?: boolean;
    is_refunded?: boolean;
    is_standalone_payment?: boolean;
    is_voided?: boolean;
    order?: {
      id?: number;
      merchant_order_id?: string | null;
    };
    owner?: number;
    pending?: boolean;
    source_data?: {
      pan?: string;
      sub_type?: string;
      type?: string;
    };
    special_reference?: string;
    success?: boolean | string;
    merchant_order_id?: string;
  };
}

@Injectable()
export class PaymobProvider implements IPaymentProvider {
  private readonly logger = new Logger(PaymobProvider.name);
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly apiKey: string;
  private readonly hmacSecret: string;
  private readonly integrationIds: number[];
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYMOB_SECRET_KEY') || '';
    this.publicKey = this.configService.get<string>('PAYMOB_PUBLIC_KEY') || '';
    this.apiKey = this.configService.get<string>('PAYMOB_API_KEY') || '';
    this.hmacSecret =
      this.configService.get<string>('PAYMOB_HMAC_SECRET') || '';

    const integrationIdsRaw = this.configService.get<string>(
      'PAYMOB_INTEGRATION_IDS',
    );
    if (integrationIdsRaw) {
      this.integrationIds = integrationIdsRaw
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id) && id > 0);
    } else {
      const singleId = this.configService.get<number>('PAYMOB_INTEGRATION_ID');
      this.integrationIds = singleId
        ? [Number(singleId)]
        : [5920300, 5920296, 5920302];
    }

    const rawBaseUrl =
      this.configService.get<string>('PAYMOB_API_BASE_URL') ||
      'https://accept.paymob.com';
    this.apiBaseUrl = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }

  async createPayment(data: CreatePaymentData): Promise<PaymentCreationResult> {
    try {
      const specialReference =
        data.metadata?.transactionId || data.idempotencyKey;

      const payload = {
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        payment_methods: this.integrationIds,
        items: [
          {
            name: 'Wallet Deposit',
            amount: data.amount,
            description: 'Mazadak Wallet Deposit',
            quantity: 1,
          },
        ],
        billing_data: {
          apartment: 'NA',
          first_name: data.firstName || 'Customer',
          last_name: data.lastName || 'User',
          street: 'NA',
          building: 'NA',
          phone_number: data.phone || '+201000000000',
          city: 'Cairo',
          country: 'EGY',
          email: data.email || 'customer@mazadak.com',
          floor: 'NA',
          state: 'Cairo',
          shipping_method: 'NA',
          postal_code: 'NA',
        },
        customer: {
          first_name: data.firstName || 'Customer',
          last_name: data.lastName || 'User',
          email: data.email || 'customer@mazadak.com',
        },
        special_reference: specialReference,
      };

      const response = await axios.post<PaymobIntentionResponse>(
        `${this.apiBaseUrl}/v1/intention/`,
        payload,
        {
          headers: {
            Authorization: `Token ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const clientSecret = response.data.client_secret;
      const gatewayPaymentIntentId =
        response.data.id?.toString() ||
        response.data.intention_order_id?.toString() ||
        specialReference;

      const paymentUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${this.publicKey}&clientSecret=${clientSecret}`;

      return {
        gatewayPaymentIntentId,
        clientSecret,
        paymentUrl,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to create Paymob Intention payment: ${err.message}`,
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
      if (!signature) {
        return false;
      }

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

      const calculatedBuf = Buffer.from(calculatedHmac, 'hex');
      const signatureBuf = Buffer.from(signature, 'hex');

      if (calculatedBuf.length !== signatureBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(calculatedBuf, signatureBuf);
    } catch (error: unknown) {
      this.logger.error(
        `Paymob Webhook Signature Verification Failed: ${String(error)}`,
      );
      return false;
    }
  }

  extractWebhookData(payload: Record<string, unknown>): ExtractedWebhookData {
    const paymobPayload = payload as PaymobWebhookPayload;
    const obj = paymobPayload.obj;

    const transactionId =
      obj?.special_reference ??
      paymobPayload?.special_reference ??
      obj?.order?.merchant_order_id ??
      obj?.merchant_order_id;

    const success = obj?.success;
    const isSuccess =
      (success === true || success === 'true') &&
      obj?.pending !== true &&
      obj?.is_voided !== true &&
      obj?.is_refunded !== true &&
      obj?.error_occured !== true;

    const amountMinorUnits = Number(obj?.amount_cents || 0);
    const rawCurrency = obj?.currency;
    const currency = String(rawCurrency || 'EGP').toUpperCase();

    return {
      transactionId: transactionId || undefined,
      isSuccess,
      amountMinorUnits,
      currency,
    };
  }

  private async getAuthToken(): Promise<string> {
    const authResponse = await axios.post<PaymobAuthResponse>(
      `${this.apiBaseUrl}/api/auth/tokens`,
      {
        api_key: this.apiKey,
      },
    );
    return authResponse.data.token;
  }

  async refund(data: RefundPaymentData): Promise<void> {
    try {
      const token = await this.getAuthToken();
      await axios.post(`${this.apiBaseUrl}/api/acceptance/void_refund/refund`, {
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
      }>(`${this.apiBaseUrl}/api/ecommerce/orders/${gatewayPaymentIntentId}`, {
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
}
