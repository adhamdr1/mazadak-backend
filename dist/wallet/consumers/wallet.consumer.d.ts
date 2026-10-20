import { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import Redis from 'ioredis';
import { type IWalletRepository } from '../interfaces/wallet.repository.interface';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { TransactionService } from '../../transaction/transaction.service';
export declare class WalletConsumer implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly redis;
    private readonly walletRepository;
    private readonly outboxService;
    private readonly configService;
    private readonly mongooseConnection;
    private readonly transactionService;
    private readonly logger;
    private connection;
    private channelWrapper;
    private readonly queueName;
    constructor(redis: Redis, walletRepository: IWalletRepository, outboxService: OutboxService, configService: ConfigService, mongooseConnection: Connection, transactionService: TransactionService);
    onApplicationBootstrap(): void;
    onModuleDestroy(): Promise<void>;
    private handleMessage;
    private handleWalletDepositInitiated;
    private handleProcessingError;
}
