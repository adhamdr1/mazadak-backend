import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersResolver } from './admin-users.resolver';
import { UsersService } from '../../users/users.service';
import { WalletService } from '../../wallet/wallet.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { TransactionService } from '../../transaction/transaction.service';

describe('AdminUsersResolver', () => {
  let resolver: AdminUsersResolver;

  const mockUsersService = {
    findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    findById: jest.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }),
    toggleBan: jest.fn().mockResolvedValue({ id: '1', isBanned: true }),
  };

  const mockWalletService = {
    getWalletByUserId: jest.fn().mockResolvedValue({ balance: 0 }),
  };

  const mockAuctionsService = {
    findMyAuctions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  const mockTransactionService = {
    getMyTransactions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersResolver,
        { provide: UsersService, useValue: mockUsersService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: AuctionsService, useValue: mockAuctionsService },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    resolver = module.get<AdminUsersResolver>(AdminUsersResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should call usersService.findAll', async () => {
    await resolver.adminGetUsers({ page: 1, limit: 10 }, {});
    expect(mockUsersService.findAll).toHaveBeenCalled();
  });
});
