import { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
export declare class RabbitMQSetupService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private connection;
    private channelWrapper;
    constructor(configService: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    assertTopology(channel: amqplib.Channel): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
