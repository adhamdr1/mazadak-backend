import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { WalletService } from '../../wallet/wallet.service';
import { TransactionService } from '../../transaction/transaction.service';
import { DashboardStats } from '../dto/dashboard-stats.dto';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { AuctionStatus } from '../../auctions/enums/auction-status.enum';

const DASHBOARD_STATS_CACHE_KEY = 'admin:dashboard:stats';
const DASHBOARD_STATS_TTL_MS = 5 * 60 * 1000; // 5 minutes soft TTL
const DASHBOARD_STATS_HARD_TTL_S = 60 * 60; // 1 hour hard TTL

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly auctionsService: AuctionsService,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    return this.redisService.getOrSetSWR(
      DASHBOARD_STATS_CACHE_KEY,
      DASHBOARD_STATS_TTL_MS,
      DASHBOARD_STATS_HARD_TTL_S,
      async () => {
        const [
          totalUsers,
          verifiedUsersCount,
          activeAuctions,
          completedAuctions,
          cancelledAuctions,
          totalTransactions,
          totalWalletBalance,
          todaysRevenue,
        ] = await Promise.all([
          this.usersService.countAll({}),
          this.usersService.countVerifiedUsers(),
          this.auctionsService.countAuctions({ status: AuctionStatus.ACTIVE }),
          this.auctionsService.countAuctions({ status: AuctionStatus.ENDED }),
          this.auctionsService.countAuctions({
            status: AuctionStatus.CANCELLED,
          }),
          this.transactionService.countTransactions({}),
          this.walletService.sumAllBalances(),
          this.transactionService.sumTodayRevenue(),
        ]);

        return {
          totalUsers,
          verifiedUsers: verifiedUsersCount,
          activeAuctions,
          completedAuctions,
          cancelledAuctions,
          totalWalletBalance,
          todaysRevenue,
          totalTransactions,
        };
      },
    );
  }
}
