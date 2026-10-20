import { UsersService } from '../../users/users.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { WalletService } from '../../wallet/wallet.service';
import { TransactionService } from '../../transaction/transaction.service';
import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { EscrowService } from '../../escrow/services/escrow.service';
import { DashboardStats } from '../dto/dashboard-stats.dto';
import { TreasuryStats } from '../dto/treasury-stats.type';
import { RedisService } from '../../infrastructure/redis/redis.service';
export declare class AdminAnalyticsService {
    private readonly usersService;
    private readonly auctionsService;
    private readonly walletService;
    private readonly transactionService;
    private readonly withdrawalsService;
    private readonly escrowService;
    private readonly redisService;
    constructor(usersService: UsersService, auctionsService: AuctionsService, walletService: WalletService, transactionService: TransactionService, withdrawalsService: WithdrawalsService, escrowService: EscrowService, redisService: RedisService);
    getDashboardStats(): Promise<DashboardStats>;
    getTreasuryStats(): Promise<TreasuryStats>;
}
