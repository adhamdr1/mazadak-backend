import { Connection } from 'mongoose';
import Redis from 'ioredis';
import type { ITransactionRepository } from '../transaction/interfaces/transaction.repository.interface';
import { TransactionService } from '../transaction/transaction.service';
export declare class PaymentExpirationService {
    private readonly transactionRepository;
    private readonly transactionService;
    private readonly connection;
    private readonly redis;
    private readonly logger;
    constructor(transactionRepository: ITransactionRepository, transactionService: TransactionService, connection: Connection, redis: Redis);
    handleExpiredPayments(): Promise<void>;
}
