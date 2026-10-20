import { ClientSession } from 'mongoose';
import { TransactionStatus } from './enums/transaction-status.enum';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { type ITransactionRepository, type CreateTransactionData } from './interfaces/transaction.repository.interface';
import { Transaction } from './entities/transaction.entity';
import { TransactionsPage } from './dto/transactions-page.type';
import { TransactionsFilterInput } from './dto/transactions-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';
export declare class TransactionService {
    private readonly transactionRepository;
    private readonly outboxService;
    constructor(transactionRepository: ITransactionRepository, outboxService: OutboxService);
    createTransaction(data: CreateTransactionData, session?: ClientSession): Promise<Transaction>;
    updateGatewayPaymentIntentId(id: string, gatewayPaymentIntentId: string, session?: ClientSession): Promise<Transaction | null>;
    findByIdWithinSession(id: string, session?: ClientSession): Promise<Transaction | null>;
    markWalletCredited(id: string, session?: ClientSession): Promise<Transaction | null>;
    updateTransactionStatusDirect(transactionId: string, status: TransactionStatus, session: ClientSession): Promise<void>;
    updateTransactionStatusAndEmitOutbox(transactionId: string, status: TransactionStatus, webhookAmount: number, webhookCurrency: string, session: ClientSession): Promise<void>;
    getTransactionsByWalletId(walletId: string, input: PaginationInput, filter?: TransactionsFilterInput): Promise<TransactionsPage>;
    getAllTransactions(input: PaginationInput, filter?: TransactionsFilterInput): Promise<TransactionsPage>;
    countTransactions(filter?: TransactionsFilterInput): Promise<number>;
    sumTodayRevenue(): Promise<number>;
}
