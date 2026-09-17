import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { TreasuryStats } from '../dto/treasury-stats.type';
import { AdminAdjustBalanceInput } from '../dto/admin-adjust-balance.input';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminFinancialResolver {
  constructor(
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly withdrawalsService: WithdrawalsService,
  ) {}

  @Query(() => TreasuryStats, { name: 'adminGetTreasuryStats' })
  async adminGetTreasuryStats(): Promise<TreasuryStats> {
    return this.adminAnalyticsService.getTreasuryStats();
  }

  @Mutation(() => Wallet, { name: 'adminAdjustUserBalance' })
  async adminAdjustUserBalance(
    @CurrentUser() admin: JwtPayload,
    @Args('input') input: AdminAdjustBalanceInput,
  ): Promise<Wallet> {
    return this.withdrawalsService.adminAdjustBalance(admin.sub, input);
  }
}
