import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { TransactionService } from '../transaction/transaction.service';
import { WalletNotFoundException } from './exceptions/wallet-not-found.exception';
import { InsufficientFundsException } from './exceptions/insufficient-funds.exception';
import { InvalidAmountException } from './exceptions/invalid-amount.exception';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { Types } from 'mongoose';

const mockWalletRepository = {
  findByUserId: jest.fn(),
  create: jest.fn(),
  creditBalance: jest.fn(),
  debitBalance: jest.fn(),
  holdBalance: jest.fn(),
  releaseBalance: jest.fn(),
  captureHeldBalance: jest.fn(),
};

const mockTransactionService = {
  createTransaction: jest.fn(),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: 'IWalletRepository', useValue: mockWalletRepository },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const userId = new Types.ObjectId().toString();
  const walletId = new Types.ObjectId().toString();
  const mockWallet = { _id: walletId, userId, balance: 100, heldBalance: 0 };

  describe('createWallet', () => {
    it('should create a wallet', async () => {
      mockWalletRepository.create.mockResolvedValue(mockWallet);
      const result = await service.createWallet(userId);
      expect(result).toEqual(mockWallet);
      expect(mockWalletRepository.create).toHaveBeenCalledWith(
        userId,
        undefined,
      );
    });
  });

  describe('getMyWallet', () => {
    it('should return wallet if exists', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const result = await service.getMyWallet(userId);
      expect(result).toEqual(mockWallet);
      expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should throw WalletNotFoundException if not found', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);
      await expect(service.getMyWallet(userId)).rejects.toThrow(
        WalletNotFoundException,
      );
    });
  });

  describe('deposit', () => {
    it('should throw InvalidAmountException if amount <= 0', async () => {
      await expect(service.deposit(userId, 0)).rejects.toThrow(
        InvalidAmountException,
      );
      await expect(service.deposit(userId, -10)).rejects.toThrow(
        InvalidAmountException,
      );
    });

    it('should throw WalletNotFoundException if wallet does not exist', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);
      await expect(service.deposit(userId, 100)).rejects.toThrow(
        WalletNotFoundException,
      );
      expect(mockTransactionService.createTransaction).not.toHaveBeenCalled();
    });

    it('should throw WalletNotFoundException if deposit fails and log FAILED tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      mockWalletRepository.creditBalance.mockResolvedValue(null);

      await expect(service.deposit(userId, 100)).rejects.toThrow(
        WalletNotFoundException,
      );

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.DEPOSIT,
        amount: 100,
        status: TransactionStatus.FAILED,
        referenceId: undefined,
      });
    });

    it('should deposit successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 200 };
      mockWalletRepository.creditBalance.mockResolvedValue(updatedWallet);

      const result = await service.deposit(userId, 100);

      expect(result).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.DEPOSIT,
        amount: 100,
        status: TransactionStatus.SUCCESS,
        referenceId: undefined,
      });
    });
  });

  describe('withdraw', () => {
    it('should withdraw successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 50 };
      mockWalletRepository.debitBalance.mockResolvedValue(updatedWallet);

      const result = await service.withdraw(userId, 50);

      expect(result).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.WITHDRAW,
        amount: 50,
        status: TransactionStatus.SUCCESS,
        referenceId: undefined,
      });
    });

    it('should throw InsufficientFundsException if withdraw fails and log FAILED tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      mockWalletRepository.debitBalance.mockResolvedValue(null);

      await expect(service.withdraw(userId, 150)).rejects.toThrow(
        InsufficientFundsException,
      );

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.WITHDRAW,
        amount: 150,
        status: TransactionStatus.FAILED,
        referenceId: undefined,
      });
    });
  });

  describe('hold', () => {
    const refId = 'auction-123';

    it('should hold successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 50, heldBalance: 50 };
      mockWalletRepository.holdBalance.mockResolvedValue(updatedWallet);

      const result = await service.hold(userId, 50, refId);

      expect(result).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.HOLD,
        amount: 50,
        status: TransactionStatus.SUCCESS,
        referenceId: refId,
      });
    });

    it('should throw InsufficientFundsException if hold fails and log FAILED tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      mockWalletRepository.holdBalance.mockResolvedValue(null);

      await expect(service.hold(userId, 150, refId)).rejects.toThrow(
        InsufficientFundsException,
      );

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.HOLD,
        amount: 150,
        status: TransactionStatus.FAILED,
        referenceId: refId,
      });
    });
  });

  describe('release', () => {
    const refId = 'auction-123';

    it('should release successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 150, heldBalance: 0 };
      mockWalletRepository.releaseBalance.mockResolvedValue(updatedWallet);

      const result = await service.release(userId, 50, refId);

      expect(result).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.RELEASE,
        amount: 50,
        status: TransactionStatus.SUCCESS,
        referenceId: refId,
      });
    });

    it('should throw InsufficientFundsException if release fails and log FAILED tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      mockWalletRepository.releaseBalance.mockResolvedValue(null);

      await expect(service.release(userId, 150, refId)).rejects.toThrow(
        InsufficientFundsException,
      );

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.RELEASE,
        amount: 150,
        status: TransactionStatus.FAILED,
        referenceId: refId,
      });
    });
  });

  describe('capture', () => {
    const refId = 'auction-123';

    it('should capture successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 50, heldBalance: 0 };
      mockWalletRepository.captureHeldBalance.mockResolvedValue(updatedWallet);

      const result = await service.capture(userId, 50, refId);

      expect(result).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.CAPTURE,
        amount: 50,
        status: TransactionStatus.SUCCESS,
        referenceId: refId,
      });
    });

    it('should throw InsufficientFundsException if capture fails and log FAILED tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      mockWalletRepository.captureHeldBalance.mockResolvedValue(null);

      await expect(service.capture(userId, 150, refId)).rejects.toThrow(
        InsufficientFundsException,
      );

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        walletId,
        type: TransactionType.CAPTURE,
        amount: 150,
        status: TransactionStatus.FAILED,
        referenceId: refId,
      });
    });
  });
});
