import { type RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentService } from './payment.service';
import * as JwtPayloadInterface from '../auth/interfaces/jwt-payload.interface';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentInitResult } from './dto/payment-init-result.type';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    initializePayment(currentUser: JwtPayloadInterface.JwtPayload, dto: InitializePaymentDto): Promise<PaymentInitResult>;
    handleStripeWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
    handlePaymobWebhook(req: RawBodyRequest<Request>, querySignature?: string, headerHmac?: string, headerXPaymobHmac?: string): Promise<{
        received: boolean;
    }>;
}
