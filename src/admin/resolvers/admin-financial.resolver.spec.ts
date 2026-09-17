import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AdminFinancialResolver } from './admin-financial.resolver';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { AdminAdjustBalanceType } from '../dto/admin-adjust-balance.input';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

describe('AdminFinancialResolver', () => {
  let resolver: AdminFinancialResolver;

  const mockAdminAnalyticsService = {
    getTreasuryStats: jest.fn(),
  };

  const mockWithdrawalsService = {
    adminAdjustBalance: jest.fn(),
  };

  const adminUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    role: UserRole.ADMIN,
    email: 'finance-admin@mazadak.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminFinancialResolver,
        {
          provide: AdminAnalyticsService,
          useValue: mockAdminAnalyticsService,
        },
        {
          provide: WithdrawalsService,
          useValue: mockWithdrawalsService,
        },
      ],
    }).compile();

    resolver = module.get<AdminFinancialResolver>(AdminFinancialResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('adminGetTreasuryStats', () => {
    it('should delegate to adminAnalyticsService.getTreasuryStats', async () => {
      const mockStats = {
        totalWalletBalance: 500000,
        totalHeldInWallets: 45000,
        totalPendingWithdrawals: 20000,
        pendingWithdrawalsCount: 3,
        totalHeldInEscrow: 60000,
        totalCompletedPayouts: 300000,
        totalCollectedFees: 2400,
      };
      mockAdminAnalyticsService.getTreasuryStats.mockResolvedValue(mockStats);

      const result = await resolver.adminGetTreasuryStats();

      expect(result).toEqual(mockStats);
      expect(mockAdminAnalyticsService.getTreasuryStats).toHaveBeenCalled();
    });
  });

  describe('adminAdjustUserBalance', () => {
    it('should delegate to withdrawalsService.adminAdjustBalance', async () => {
      const input = {
        userId: new Types.ObjectId().toString(),
        amount: 250,
        type: AdminAdjustBalanceType.CREDIT,
        reason: 'Compensatory goodwill credit',
      };
      const mockUpdatedWallet = { userId: input.userId, balance: 1250 };
      mockWithdrawalsService.adminAdjustBalance.mockResolvedValue(
        mockUpdatedWallet,
      );

      const result = await resolver.adminAdjustUserBalance(adminUser, input);

      expect(result).toEqual(mockUpdatedWallet);
      expect(mockWithdrawalsService.adminAdjustBalance).toHaveBeenCalledWith(
        adminUser.sub,
        input,
      );
    });
  });
});
