import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { WalletService } from '../../wallet/wallet.service';
import { TransactionService } from '../../transaction/transaction.service';
import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { EscrowService } from '../../escrow/services/escrow.service';
import { DashboardStats } from '../dto/dashboard-stats.dto';
import { TreasuryStats } from '../dto/treasury-stats.type';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { AuctionStatus } from '../../auctions/enums/auction-status.enum';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly auctionsService: AuctionsService,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly withdrawalsService: WithdrawalsService,
    private readonly escrowService: EscrowService,
    private readonly redisService: RedisService,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      verifiedUsersCount,
      activeAuctions,
      completedAuctions,
      cancelledAuctions,
      totalTransactions,
      totalWalletBalance,
      todaysRevenue,
      pendingWithdrawalsCount,
      pendingWithdrawalsAmount,
      totalCompletedPayouts,
      totalCollectedFees,
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
      this.withdrawalsService.countPendingWithdrawals(),
      this.withdrawalsService.sumPendingWithdrawals(),
      this.withdrawalsService.sumCompletedWithdrawals(),
      this.withdrawalsService.sumCollectedFees(),
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
      pendingWithdrawalsCount,
      pendingWithdrawalsAmount,
      totalCompletedPayouts,
      totalCollectedFees,
    };
  }

  async getTreasuryStats(): Promise<TreasuryStats> {
    const [
      totalWalletBalance,
      totalHeldInWallets,
      pendingWithdrawalsCount,
      totalPendingWithdrawals,
      totalHeldInEscrow,
      totalCompletedPayouts,
      totalCollectedFees,
    ] = await Promise.all([
      this.walletService.sumAllBalances(),
      this.walletService.sumHeldBalances(),
      this.withdrawalsService.countPendingWithdrawals(),
      this.withdrawalsService.sumPendingWithdrawals(),
      this.escrowService.sumHeldEscrows(),
      this.withdrawalsService.sumCompletedWithdrawals(),
      this.withdrawalsService.sumCollectedFees(),
    ]);

    return {
      totalWalletBalance,
      totalHeldInWallets,
      totalPendingWithdrawals,
      pendingWithdrawalsCount,
      totalHeldInEscrow,
      totalCompletedPayouts,
      totalCollectedFees,
    };
  }
}
