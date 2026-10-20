import { ClientSession, Connection } from 'mongoose';
import type { IWalletRepository } from './interfaces/wallet.repository.interface';
import { Wallet } from './entities/wallet.entity';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionReferenceType } from '../transaction/enums/transaction-reference-type.enum';
import { Transaction } from '../transaction/entities/transaction.entity';
import { WalletsPage } from './dto/wallets-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
export declare class WalletService {
    private readonly walletRepository;
    private readonly transactionService;
    private readonly outboxService;
    private readonly realtimeService;
    private readonly connection;
    private readonly logger;
    constructor(walletRepository: IWalletRepository, transactionService: TransactionService, outboxService: OutboxService, realtimeService: RealtimeService, connection: Connection);
    private validateAmount;
    private getWalletOrThrow;
    private executeWalletOp;
    createWallet(userId: string, session?: ClientSession): Promise<Wallet>;
    getAllWallets(input: PaginationInput): Promise<WalletsPage>;
    getWalletByUserId(userId: string): Promise<Wallet>;
    getWalletsByUserIds(userIds: string[]): Promise<Wallet[]>;
    sumAllBalances(): Promise<number>;
    sumHeldBalances(): Promise<number>;
    getMyWallet(userId: string): Promise<Wallet>;
    deposit(userId: string, amount: number, referenceId?: string, session?: ClientSession, currency?: string, referenceType?: TransactionReferenceType, customType?: TransactionType): Promise<{
        wallet: Wallet;
        transaction: Transaction;
    }>;
    withdraw(userId: string, amount: number, referenceId?: string, session?: ClientSession, referenceType?: TransactionReferenceType, customType?: TransactionType): Promise<{
        wallet: Wallet;
        transaction: Transaction;
    }>;
    private executeWithdrawal;
    private notifyDeposit;
    private notifyWithdrawal;
    hold(userId: string, amount: number, referenceId?: string, session?: ClientSession, referenceType?: TransactionReferenceType): Promise<{
        wallet: Wallet;
        transaction: Transaction;
    }>;
    release(userId: string, amount: number, referenceId?: string, session?: ClientSession, referenceType?: TransactionReferenceType): Promise<{
        wallet: Wallet;
        transaction: Transaction;
    }>;
    capture(userId: string, amount: number, referenceId?: string, session?: ClientSession, referenceType?: TransactionReferenceType): Promise<{
        wallet: Wallet;
        transaction: Transaction;
    }>;
}
