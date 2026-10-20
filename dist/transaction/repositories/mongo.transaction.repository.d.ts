import { Model, ClientSession } from 'mongoose';
import { ITransactionRepository, CreateTransactionData } from '../interfaces/transaction.repository.interface';
import { Transaction, TransactionDocument } from '../entities/transaction.entity';
import { TransactionsFilterInput } from '../dto/transactions-filter.input';
export declare class MongoTransactionRepository implements ITransactionRepository {
    private readonly transactionModel;
    constructor(transactionModel: Model<TransactionDocument>);
    create(data: CreateTransactionData, session?: ClientSession): Promise<Transaction>;
    findById(id: string, session?: ClientSession): Promise<Transaction | null>;
    markHasChild(id: string, session?: ClientSession): Promise<Transaction | null>;
    updateGatewayPaymentIntentId(id: string, gatewayPaymentIntentId: string, session?: ClientSession): Promise<Transaction | null>;
    markWalletCredited(id: string, session?: ClientSession): Promise<Transaction | null>;
    private shouldApplyDefaultTransactionFilter;
    private buildFilterQuery;
    findByWalletId(walletId: string, page: number, limit: number, filter?: TransactionsFilterInput): Promise<Transaction[]>;
    countByWalletId(walletId: string, filter?: TransactionsFilterInput): Promise<number>;
    findAll(page: number, limit: number, filter?: TransactionsFilterInput): Promise<Transaction[]>;
    countAll(filter?: TransactionsFilterInput): Promise<number>;
    sumTodayRevenue(): Promise<number>;
}
