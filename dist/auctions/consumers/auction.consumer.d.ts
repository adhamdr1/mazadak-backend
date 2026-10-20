import { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuctionsService } from '../auctions.service';
export declare class AuctionConsumer implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly redis;
    private readonly auctionsService;
    private readonly configService;
    private readonly logger;
    private connection;
    private channelWrapper;
    private readonly queueName;
    constructor(redis: Redis, auctionsService: AuctionsService, configService: ConfigService);
    onApplicationBootstrap(): void;
    onModuleDestroy(): Promise<void>;
    private handleMessage;
    private handleUserBanned;
    private handleUserSoftDeleted;
    private handleProcessingError;
}
