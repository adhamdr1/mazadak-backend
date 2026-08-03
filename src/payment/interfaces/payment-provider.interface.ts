import { PaymentStatus } from '../enums/payment-status.enum';

export interface CreatePaymentData {
  amount: number; // in minor units
  currency: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface PaymentCreationResult {
  gatewayPaymentIntentId: string;
  clientSecret: string | null;
  paymentUrl: string | null;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  gatewayTransactionId?: string;
}

export interface RefundPaymentData {
  gatewayPaymentIntentId: string;
  amount: number; // in minor units
  currency: string;
  reason?: string;
}

export interface ExtractedWebhookData {
  transactionId?: string;
  isSuccess: boolean;
  amountMinorUnits: number;
  currency: string;
}

export interface IPaymentProvider {
  createPayment(data: CreatePaymentData): Promise<PaymentCreationResult>;

  refund(data: RefundPaymentData): Promise<void>;

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret?: string,
  ): boolean;

  getPaymentStatus(
    gatewayPaymentIntentId: string,
  ): Promise<PaymentStatusResult>;

  extractWebhookData(payload: Record<string, unknown>): ExtractedWebhookData;
}
