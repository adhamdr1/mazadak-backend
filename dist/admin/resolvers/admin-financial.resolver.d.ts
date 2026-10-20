import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { TreasuryStats } from '../dto/treasury-stats.type';
import { AdminAdjustBalanceInput } from '../dto/admin-adjust-balance.input';
import { Wallet } from '../../wallet/entities/wallet.entity';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
export declare class AdminFinancialResolver {
    private readonly adminAnalyticsService;
    private readonly withdrawalsService;
    constructor(adminAnalyticsService: AdminAnalyticsService, withdrawalsService: WithdrawalsService);
    adminGetTreasuryStats(): Promise<TreasuryStats>;
    adminAdjustUserBalance(admin: JwtPayload, input: AdminAdjustBalanceInput): Promise<Wallet>;
}
