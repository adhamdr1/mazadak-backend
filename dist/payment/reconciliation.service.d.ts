import { Connection } from 'mongoose';
import Redis from 'ioredis';
import type { ITransactionRepository } from '../transaction/interfaces/transaction.repository.interface';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { TransactionService } from '../transaction/transaction.service';
export declare class ReconciliationService {
    private readonly transactionRepository;
    private readonly connection;
    private readonly providerFactory;
    private readonly transactionService;
    private readonly redis;
    private readonly logger;
    constructor(transactionRepository: ITransactionRepository, connection: Connection, providerFactory: PaymentProviderFactory, transactionService: TransactionService, redis: Redis);
    reconcilePendingPayments(): Promise<void>;
}
