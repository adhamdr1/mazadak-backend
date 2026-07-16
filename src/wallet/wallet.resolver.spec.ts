import { Test, TestingModule } from '@nestjs/testing';
import { WalletResolver } from './wallet.resolver';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { Types } from 'mongoose';
import { DepositInput } from './dto/deposit.input';
import { WithdrawInput } from './dto/withdraw.input';

const mockWalletService = {
  getMyWallet: jest.fn(),
  deposit: jest.fn(),
  withdraw: jest.fn(),
};

describe('WalletResolver', () => {
  let resolver: WalletResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletResolver,
        { provide: WalletService, useValue: mockWalletService },
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

  describe('availableBalance', () => {
    it('should calculate available balance correctly', () => {
      const result = resolver.availableBalance(mockWallet);
      expect(result).toBe(70); // 100 - 30
    });
  });

  describe('deposit', () => {
    it('should call deposit on wallet service', async () => {
      const depositInput: DepositInput = { amount: 50 };
      const updatedWallet = { ...mockWallet, balance: 150 };
      mockWalletService.deposit.mockResolvedValue(updatedWallet);

      const result = await resolver.deposit(currentUser, depositInput);

      expect(result).toEqual(updatedWallet);
      expect(mockWalletService.deposit).toHaveBeenCalledWith(
        currentUser.sub,
        50,
      );
    });
  });

  describe('withdraw', () => {
    it('should call withdraw on wallet service', async () => {
      const withdrawInput: WithdrawInput = { amount: 20 };
      const updatedWallet = { ...mockWallet, balance: 80 };
      mockWalletService.withdraw.mockResolvedValue(updatedWallet);

      const result = await resolver.withdraw(currentUser, withdrawInput);

      expect(result).toEqual(updatedWallet);
      expect(mockWalletService.withdraw).toHaveBeenCalledWith(
        currentUser.sub,
        20,
      );
    });
  });
});
