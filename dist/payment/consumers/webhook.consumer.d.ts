import { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../payment.service';
export declare class WebhookConsumer implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly configService;
    private readonly paymentService;
    private readonly logger;
    private connection;
    private channelWrapper;
    constructor(configService: ConfigService, paymentService: PaymentService);
    onApplicationBootstrap(): void;
    private handleMessage;
    private handleProcessingError;
    onModuleDestroy(): Promise<void>;
}
