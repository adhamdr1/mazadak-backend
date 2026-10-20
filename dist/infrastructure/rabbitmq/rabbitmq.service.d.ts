import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQEvent, RabbitMQEventPayload } from './rabbitmq-event.types';
export declare class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private connection;
    private channelWrapper;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    publish(eventType: RabbitMQEvent, payload: RabbitMQEventPayload, correlationId?: string, messageId?: string): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
