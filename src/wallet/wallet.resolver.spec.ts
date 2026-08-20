import { Test, TestingModule } from '@nestjs/testing';
import { WalletResolver } from './wallet.resolver';
import { WalletService } from './wallet.service';
import { TransactionService } from '../transaction/transaction.service';
import { Wallet } from './entities/wallet.entity';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { Types } from 'mongoose';
import { WithdrawInput } from './dto/withdraw.input';

import { PaginationInput } from '../common/dto/pagination.input';

const mockWalletService = {
  getMyWallet: jest.fn(),
  deposit: jest.fn(),
  withdraw: jest.fn(),
  getAllWallets: jest.fn(),
  getWalletByUserId: jest.fn(),
};

const mockTransactionService = {
  getTransactionsByWalletId: jest.fn(),
};

describe('WalletResolver', () => {
  let resolver: WalletResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletResolver,
        { provide: WalletService, useValue: mockWalletService },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    resolver = module.get<WalletResolver>(WalletResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const currentUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    role: UserRole.USER,
    email: 'test@example.com',
  };
  const mockWallet = {
    _id: new Types.ObjectId().toString(),
    userId: currentUser.sub,
    balance: 100,
    heldBalance: 30,
  } as unknown as Wallet;

  describe('myWallet', () => {
    it('should return the current user wallet', async () => {
      mockWalletService.getMyWallet.mockResolvedValue(mockWallet);
      const result = await resolver.myWallet(currentUser);

      expect(result).toEqual(mockWallet);
      expect(mockWalletService.getMyWallet).toHaveBeenCalledWith(
        currentUser.sub,
      );
    });
  });

  describe('myTransactions', () => {
    it('should call getTransactionsByWalletId on transaction service with walletId', async () => {
      mockWalletService.getMyWallet.mockResolvedValue(mockWallet);
      const expectedPage = {
        items: [],
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      };
      mockTransactionService.getTransactionsByWalletId.mockResolvedValue(
        expectedPage,
      );

      const input = { page: 1, limit: 10 };
      const filter = { search: 'tx123' };
      const result = await resolver.myTransactions(currentUser, input, filter);

      expect(result).toEqual(expectedPage);
      expect(mockWalletService.getMyWallet).toHaveBeenCalledWith(
        currentUser.sub,
      );
      expect(
        mockTransactionService.getTransactionsByWalletId,
      ).toHaveBeenCalledWith(mockWallet._id.toString(), input, filter);
    });
  });

  describe('availableBalance', () => {
    it('should calculate available balance correctly', () => {
      const result = resolver.availableBalance(mockWallet);
      expect(result).toBe('70'); // 100 - 30
    });
  });

  describe('withdraw', () => {
    it('should call withdraw on wallet service', async () => {
      const withdrawInput: WithdrawInput = { amount: 20 };
      const updatedWallet = { ...mockWallet, balance: 80 };
      mockWalletService.withdraw.mockResolvedValue({
        wallet: updatedWallet,
        transaction: { _id: 'mock-tx-id' },
      });

      const result = await resolver.withdraw(currentUser, withdrawInput);

      expect(result).toEqual(updatedWallet);
      expect(mockWalletService.withdraw).toHaveBeenCalledWith(
        currentUser.sub,
        20,
      );
    });
  });
  describe('wallets', () => {
    it('should call getAllWallets on service', async () => {
      const input: PaginationInput = { page: 1, limit: 10 };
      const expectedPage = {
        items: [mockWallet],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockWalletService.getAllWallets.mockResolvedValue(expectedPage);

      const result = await resolver.wallets(input);

      expect(result).toEqual(expectedPage);
      expect(mockWalletService.getAllWallets).toHaveBeenCalledWith(input);
    });
  });

  describe('adminGetWallet', () => {
    it('should call getWalletByUserId on service', async () => {
      const userId = new Types.ObjectId().toString();
      mockWalletService.getWalletByUserId.mockResolvedValue(mockWallet);

      const result = await resolver.adminGetWallet(userId);

      expect(result).toEqual(mockWallet);
      expect(mockWalletService.getWalletByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
