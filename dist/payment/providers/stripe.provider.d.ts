import { ConfigService } from '@nestjs/config';
import { IPaymentProvider, CreatePaymentData, PaymentCreationResult, RefundPaymentData, PaymentStatusResult, ExtractedWebhookData } from '../interfaces/payment-provider.interface';
export declare class StripeProvider implements IPaymentProvider {
    private readonly configService;
    private readonly logger;
    private stripe;
    private endpointSecret;
    private readonly isMock;
    constructor(configService: ConfigService);
    createPayment(data: CreatePaymentData): Promise<PaymentCreationResult>;
    verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean;
    refund(data: RefundPaymentData): Promise<void>;
    getPaymentStatus(gatewayPaymentIntentId: string): Promise<PaymentStatusResult>;
    extractWebhookData(payload: Record<string, unknown>): ExtractedWebhookData;
}
