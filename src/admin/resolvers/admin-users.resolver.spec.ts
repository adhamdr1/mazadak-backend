import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersResolver } from './admin-users.resolver';
import { UsersService } from '../../users/users.service';
import { WalletService } from '../../wallet/wallet.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { TransactionService } from '../../transaction/transaction.service';
import { Types } from 'mongoose';
import { UserRole } from '../../users/enums/user-role.enum';
import { AuthProvider } from '../../users/enums/auth-provider.enum';
import { User } from '../../users/entities/user.entity';

describe('AdminUsersResolver', () => {
  let resolver: AdminUsersResolver;

  const userId = new Types.ObjectId().toString();
  const walletId = new Types.ObjectId().toString();

  const mockUser: User = {
    _id: new Types.ObjectId(userId),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    authProvider: AuthProvider.LOCAL,
    phoneNumber: '+201000000000',
    dateOfBirth: new Date('1990-01-01'),
    address: { city: 'Cairo', street: 'Tahrir' },
    isEmailVerified: true,
    isBanned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findAll: jest.fn().mockResolvedValue({ items: [mockUser], total: 1 }),
    findById: jest.fn().mockResolvedValue(mockUser),
    toggleBan: jest.fn().mockResolvedValue({ ...mockUser, isBanned: true }),
  };

  const mockWalletService = {
    getWalletByUserId: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(walletId),
      balance: 100,
    }),
  };

  const mockAuctionsService = {
    findMyAuctions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  const mockTransactionService = {
    getTransactionsByWalletId: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should call usersService.findAll', async () => {
    const result = await resolver.adminGetUsers({ page: 1, limit: 10 }, {});
    expect(result).toEqual({ items: [mockUser], total: 1 });
    expect(mockUsersService.findAll).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      {},
    );
  });

  it('should call adminGetUserDetails', async () => {
    const result = await resolver.adminGetUserDetails(userId);

    expect(result.user).toEqual(mockUser);
    expect(result.wallet).toBeDefined();
    expect(result.recentAuctions).toEqual({ items: [], total: 0 });
    expect(result.recentTransactions).toEqual({ items: [], total: 0 });
    expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
    expect(mockWalletService.getWalletByUserId).toHaveBeenCalledWith(userId);
    expect(mockAuctionsService.findMyAuctions).toHaveBeenCalledWith(
      userId,
      { page: 1, limit: 5 },
      {},
    );
    expect(
      mockTransactionService.getTransactionsByWalletId,
    ).toHaveBeenCalledWith(walletId, { page: 1, limit: 5 });
  });

  it('should throw error in adminGetUserDetails if user not found', async () => {
    mockUsersService.findById.mockResolvedValueOnce(null);

    await expect(resolver.adminGetUserDetails(userId)).rejects.toThrow(
      'User not found',
    );
  });

  it('should call adminToggleUserBan', async () => {
    const result = await resolver.adminToggleUserBan(userId);

    expect(result.isBanned).toBe(true);
    expect(mockUsersService.toggleBan).toHaveBeenCalledWith(userId);
  });
});
