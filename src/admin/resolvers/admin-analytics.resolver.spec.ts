import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsResolver } from './admin-analytics.resolver';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import { DashboardStats } from '../dto/dashboard-stats.dto';

const mockAdminAnalyticsService = {
  getDashboardStats: jest.fn(),
};

describe('AdminAnalyticsResolver', () => {
  let resolver: AdminAnalyticsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsResolver,
        {
          provide: AdminAnalyticsService,
          useValue: mockAdminAnalyticsService,
        },
      ],
    }).compile();

    resolver = module.get<AdminAnalyticsResolver>(AdminAnalyticsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return dashboard stats', async () => {
    const stats: DashboardStats = {
      totalUsers: 100,
      verifiedUsers: 80,
      activeAuctions: 25,
      completedAuctions: 50,
      cancelledAuctions: 5,
      totalWalletBalance: 50000,
      todaysRevenue: 1500,
      totalTransactions: 200,
    };
    mockAdminAnalyticsService.getDashboardStats.mockResolvedValue(stats);

    const result = await resolver.adminGetDashboardStats();

    expect(result).toEqual(stats);
    expect(mockAdminAnalyticsService.getDashboardStats).toHaveBeenCalled();
  });
});
