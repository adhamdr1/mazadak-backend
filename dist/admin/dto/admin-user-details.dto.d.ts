import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { AuctionsPage } from '../../auctions/dto/auctions-page.type';
import { TransactionsPage } from '../../transaction/dto/transactions-page.type';
export declare class AdminUserDetails {
    user: User;
    wallet?: Wallet;
    recentAuctions?: AuctionsPage;
    recentTransactions?: TransactionsPage;
}
