import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsService } from './admin-analytics.service';
import { UsersService } from '../../users/users.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { WalletService } from '../../wallet/wallet.service';
import { TransactionService } from '../../transaction/transaction.service';
import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { EscrowService } from '../../escrow/services/escrow.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { AuctionStatus } from '../../auctions/enums/auction-status.enum';

const mockUsersService = {
  countAll: jest.fn(),
  countVerifiedUsers: jest.fn(),
};

const mockAuctionsService = {
  countAuctions: jest.fn(),
};

const mockWalletService = {
  sumAllBalances: jest.fn(),
  sumHeldBalances: jest.fn(),
};

const mockTransactionService = {
  countTransactions: jest.fn(),
  sumTodayRevenue: jest.fn(),
};

const mockWithdrawalsService = {
  countPendingWithdrawals: jest.fn(),
  sumPendingWithdrawals: jest.fn(),
  sumCompletedWithdrawals: jest.fn(),
  sumCollectedFees: jest.fn(),
};

const mockEscrowService = {
  sumHeldEscrows: jest.fn(),
};

const mockRedisService = {
  getOrSetSWR: jest.fn(
    (_key, _softTtl, _hardTtl, factory: () => Promise<unknown>) => factory(),
  ),
};

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuctionsService,
          useValue: mockAuctionsService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: WithdrawalsService,
          useValue: mockWithdrawalsService,
        },
        {
          provide: EscrowService,
          useValue: mockEscrowService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return aggregated dashboard stats', async () => {
    mockUsersService.countAll.mockResolvedValue(100);
    mockUsersService.countVerifiedUsers.mockResolvedValue(80);
    mockAuctionsService.countAuctions
      .mockResolvedValueOnce(25) // ACTIVE
      .mockResolvedValueOnce(50) // ENDED
      .mockResolvedValueOnce(5); // CANCELLED
    mockTransactionService.countTransactions.mockResolvedValue(200);
    mockWalletService.sumAllBalances.mockResolvedValue(50000);
    mockTransactionService.sumTodayRevenue.mockResolvedValue(1500);
    mockWithdrawalsService.countPendingWithdrawals.mockResolvedValue(4);
    mockWithdrawalsService.sumPendingWithdrawals.mockResolvedValue(12000);
    mockWithdrawalsService.sumCompletedWithdrawals.mockResolvedValue(85000);
    mockWithdrawalsService.sumCollectedFees.mockResolvedValue(250);

    const result = await service.getDashboardStats();

    expect(result).toEqual({
      totalUsers: 100,
      verifiedUsers: 80,
      activeAuctions: 25,
      completedAuctions: 50,
      cancelledAuctions: 5,
      totalWalletBalance: 50000,
      todaysRevenue: 1500,
      totalTransactions: 200,
      pendingWithdrawalsCount: 4,
      pendingWithdrawalsAmount: 12000,
      totalCompletedPayouts: 85000,
      totalCollectedFees: 250,
    });
    expect(mockUsersService.countAll).toHaveBeenCalledWith({});
    expect(mockUsersService.countVerifiedUsers).toHaveBeenCalled();
    expect(mockAuctionsService.countAuctions).toHaveBeenCalledWith({
      status: AuctionStatus.ACTIVE,
    });
    expect(mockAuctionsService.countAuctions).toHaveBeenCalledWith({
      status: AuctionStatus.ENDED,
    });
    expect(mockAuctionsService.countAuctions).toHaveBeenCalledWith({
      status: AuctionStatus.CANCELLED,
    });
    expect(mockTransactionService.countTransactions).toHaveBeenCalledWith({});
    expect(mockWalletService.sumAllBalances).toHaveBeenCalled();
    expect(mockTransactionService.sumTodayRevenue).toHaveBeenCalled();
    expect(mockWithdrawalsService.countPendingWithdrawals).toHaveBeenCalled();
    expect(mockWithdrawalsService.sumPendingWithdrawals).toHaveBeenCalled();
    expect(mockWithdrawalsService.sumCompletedWithdrawals).toHaveBeenCalled();
    expect(mockWithdrawalsService.sumCollectedFees).toHaveBeenCalled();
  });

  it('should return treasury stats', async () => {
    mockWalletService.sumAllBalances.mockResolvedValue(100000);
    mockWalletService.sumHeldBalances.mockResolvedValue(15000);
    mockWithdrawalsService.countPendingWithdrawals.mockResolvedValue(5);
    mockWithdrawalsService.sumPendingWithdrawals.mockResolvedValue(20000);
    mockEscrowService.sumHeldEscrows.mockResolvedValue(35000);
    mockWithdrawalsService.sumCompletedWithdrawals.mockResolvedValue(150000);
    mockWithdrawalsService.sumCollectedFees.mockResolvedValue(1200);

    const result = await service.getTreasuryStats();

    expect(result).toEqual({
      totalWalletBalance: 100000,
      totalHeldInWallets: 15000,
      totalPendingWithdrawals: 20000,
      pendingWithdrawalsCount: 5,
      totalHeldInEscrow: 35000,
      totalCompletedPayouts: 150000,
      totalCollectedFees: 1200,
    });
    expect(mockWalletService.sumAllBalances).toHaveBeenCalled();
    expect(mockWalletService.sumHeldBalances).toHaveBeenCalled();
    expect(mockWithdrawalsService.countPendingWithdrawals).toHaveBeenCalled();
    expect(mockWithdrawalsService.sumPendingWithdrawals).toHaveBeenCalled();
    expect(mockEscrowService.sumHeldEscrows).toHaveBeenCalled();
    expect(mockWithdrawalsService.sumCompletedWithdrawals).toHaveBeenCalled();
    expect(mockWithdrawalsService.sumCollectedFees).toHaveBeenCalled();
  });
});
