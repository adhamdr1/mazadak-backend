import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { TransactionService } from '../transaction/transaction.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { WalletNotFoundException } from './exceptions/wallet-not-found.exception';
import { InsufficientFundsException } from './exceptions/insufficient-funds.exception';
import { InvalidAmountException } from './exceptions/invalid-amount.exception';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { Types } from 'mongoose';
import { PaginationInput } from '../common/dto/pagination.input';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { getConnectionToken } from '@nestjs/mongoose';

const mockTransaction = { _id: new Types.ObjectId() };

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockWalletRepository = {
  findByUserId: jest.fn(),
  create: jest.fn(),
  creditBalance: jest.fn(),
  debitBalance: jest.fn(),
  holdBalance: jest.fn(),
  releaseBalance: jest.fn(),
  captureHeldBalance: jest.fn(),
  findAll: jest.fn(),
  countAll: jest.fn(),
  sumAllBalances: jest.fn(),
};

const mockTransactionService = {
  createTransaction: jest.fn().mockResolvedValue(mockTransaction),
};

const mockNotificationsService = {
  sendDepositSuccessfulEmail: jest.fn().mockResolvedValue(undefined),
  sendWithdrawalCompletedEmail: jest.fn().mockResolvedValue(undefined),
  createInAppNotification: jest.fn().mockResolvedValue(undefined),
};

const mockUsersService = {
  findById: jest.fn(),
};

const mockOutboxService = {
  saveEvent: jest.fn().mockResolvedValue(undefined),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: 'IWalletRepository', useValue: mockWalletRepository },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: OutboxService, useValue: mockOutboxService },
        {
          provide: getConnectionToken(),
          useValue: {
            startSession: jest.fn().mockResolvedValue(mockSession),
          },
        },
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

      expect(mockTransactionService.createTransaction).not.toHaveBeenCalled();
    });

    it('should deposit successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 200 };
      mockWalletRepository.creditBalance.mockResolvedValue(updatedWallet);

      const { wallet } = await service.deposit(userId, 100);

      expect(wallet).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId,
          type: TransactionType.DEPOSIT,
          amount: 100,
          status: TransactionStatus.SUCCESS,
          referenceId: undefined,
        }),
        undefined,
      );
    });
  });

  describe('withdraw', () => {
    it('should withdraw successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 50 };
      mockWalletRepository.debitBalance.mockResolvedValue(updatedWallet);

      const { wallet } = await service.withdraw(userId, 50);

      expect(wallet).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId,
          type: TransactionType.WITHDRAW,
          amount: 50,
          status: TransactionStatus.SUCCESS,
          referenceId: undefined,
        }),
        mockSession,
      );
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
        currency: 'EGP',
        status: TransactionStatus.FAILED,
        referenceId: undefined,
        referenceType: undefined,
      });
    });
  });

  describe('hold', () => {
    const refId = 'auction-123';

    it('should hold successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 50, heldBalance: 50 };
      mockWalletRepository.holdBalance.mockResolvedValue(updatedWallet);

      const { wallet } = await service.hold(userId, 50, refId);

      expect(wallet).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId,
          type: TransactionType.HOLD,
          amount: 50,
          status: TransactionStatus.SUCCESS,
          referenceId: refId,
        }),
        undefined,
      );
    });

    it('should throw InsufficientFundsException if hold fails and log FAILED tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      mockWalletRepository.holdBalance.mockResolvedValue(null);

      await expect(service.hold(userId, 150, refId)).rejects.toThrow(
        InsufficientFundsException,
      );

      expect(mockTransactionService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('release', () => {
    const refId = 'auction-123';

    it('should release successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 150, heldBalance: 0 };
      mockWalletRepository.releaseBalance.mockResolvedValue(updatedWallet);

      const { wallet } = await service.release(userId, 50, refId);

      expect(wallet).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId,
          type: TransactionType.RELEASE,
          amount: 50,
          status: TransactionStatus.SUCCESS,
          referenceId: refId,
        }),
        undefined,
      );
    });

    it('should throw InsufficientFundsException if release fails and log FAILED tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      mockWalletRepository.releaseBalance.mockResolvedValue(null);

      await expect(service.release(userId, 150, refId)).rejects.toThrow(
        InsufficientFundsException,
      );

      expect(mockTransactionService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('capture', () => {
    const refId = 'auction-123';

    it('should capture successfully and log SUCCESS tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 50, heldBalance: 0 };
      mockWalletRepository.captureHeldBalance.mockResolvedValue(updatedWallet);

      const { wallet } = await service.capture(userId, 50, refId);

      expect(wallet).toEqual(updatedWallet);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId,
          type: TransactionType.CAPTURE,
          amount: 50,
          status: TransactionStatus.SUCCESS,
          referenceId: refId,
        }),
        undefined,
      );
    });

    it('should throw InsufficientFundsException if capture fails and log FAILED tx', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      mockWalletRepository.captureHeldBalance.mockResolvedValue(null);

      await expect(service.capture(userId, 150, refId)).rejects.toThrow(
        InsufficientFundsException,
      );

      expect(mockTransactionService.createTransaction).not.toHaveBeenCalled();
    });
  });
  describe('getAllWallets', () => {
    it('should return paginated wallets', async () => {
      const input: PaginationInput = { page: 1, limit: 10 };
      mockWalletRepository.findAll.mockResolvedValue([mockWallet]);
      mockWalletRepository.countAll.mockResolvedValue(1);

      const result = await service.getAllWallets(input);

      expect(result).toEqual({
        items: [mockWallet],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      });
      expect(mockWalletRepository.findAll).toHaveBeenCalledWith(1, 10);
      expect(mockWalletRepository.countAll).toHaveBeenCalled();
    });
  });

  describe('getWalletByUserId', () => {
    it('should return the wallet for the user', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);

      const result = await service.getWalletByUserId(userId);

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should throw WalletNotFoundException if wallet does not exist', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getWalletByUserId(userId)).rejects.toThrow(
        WalletNotFoundException,
      );
    });
  });

  describe('sumAllBalances', () => {
    it('should return the sum of all wallet balances', async () => {
      mockWalletRepository.sumAllBalances.mockResolvedValue(15000);

      const result = await service.sumAllBalances();

      expect(result).toBe(15000);
      expect(mockWalletRepository.sumAllBalances).toHaveBeenCalled();
    });
  });
});
