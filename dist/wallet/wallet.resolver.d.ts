import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionsPage } from '../transaction/dto/transactions-page.type';
import { TransactionsFilterInput } from '../transaction/dto/transactions-filter.input';
import { WithdrawInput } from './dto/withdraw.input';
import { WalletsPage } from './dto/wallets-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
export declare class WalletResolver {
    private readonly walletService;
    private readonly transactionService;
    private readonly pubSub;
    constructor(walletService: WalletService, transactionService: TransactionService, pubSub: RedisPubSub);
    wallets(input: PaginationInput): Promise<WalletsPage>;
    adminGetWallet(userId: string): Promise<Wallet>;
    myWallet(currentUser: JwtPayload): Promise<Wallet>;
    myTransactions(currentUser: JwtPayload, input?: PaginationInput, filter?: TransactionsFilterInput): Promise<TransactionsPage>;
    availableBalance(wallet: Wallet): string;
    withdraw(currentUser: JwtPayload, input: WithdrawInput): Promise<Wallet>;
    walletUpdated(user: JwtPayload): AsyncIterable<{
        walletUpdated: Wallet;
    }>;
}
