import { ConfigService } from '@nestjs/config';
import { IPaymentProvider, CreatePaymentData, PaymentCreationResult, RefundPaymentData, PaymentStatusResult, ExtractedWebhookData } from '../interfaces/payment-provider.interface';
export declare class PaymobProvider implements IPaymentProvider {
    private readonly configService;
    private readonly logger;
    private readonly secretKey;
    private readonly publicKey;
    private readonly apiKey;
    private readonly hmacSecret;
    private readonly integrationIds;
    private readonly apiBaseUrl;
    constructor(configService: ConfigService);
    createPayment(data: CreatePaymentData): Promise<PaymentCreationResult>;
    verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean;
    extractWebhookData(payload: Record<string, unknown>): ExtractedWebhookData;
    private getAuthToken;
    refund(data: RefundPaymentData): Promise<void>;
    getPaymentStatus(gatewayPaymentIntentId: string): Promise<PaymentStatusResult>;
}
