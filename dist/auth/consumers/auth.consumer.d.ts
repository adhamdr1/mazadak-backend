import { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { type IAuthRepository } from '../interfaces/auth-repository.interface';
export declare class AuthConsumer implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly redis;
    private readonly authRepository;
    private readonly configService;
    private readonly logger;
    private connection;
    private channelWrapper;
    private readonly queueName;
    constructor(redis: Redis, authRepository: IAuthRepository, configService: ConfigService);
    onApplicationBootstrap(): void;
    onModuleDestroy(): Promise<void>;
    private handleMessage;
    private handleUserBanned;
    private handleProcessingError;
}
