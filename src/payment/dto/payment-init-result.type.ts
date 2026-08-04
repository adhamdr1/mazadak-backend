export class PaymentInitResult {
  gatewayPaymentIntentId!: string;
  clientSecret!: string | null;
  paymentUrl!: string | null;
  idempotencyKey!: string;
}
