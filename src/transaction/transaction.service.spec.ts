import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { WalletNotFoundException } from '../wallet/exceptions/wallet-not-found.exception';
import { TransactionType } from './enums/transaction-type.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { Types } from 'mongoose';

const mockTransactionRepository = {
  create: jest.fn(),
  findByWalletId: jest.fn(),
  countByWalletId: jest.fn(),
};

const mockWalletRepository = {
  findByUserId: jest.fn(),
};

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: 'ITransactionRepository',
          useValue: mockTransactionRepository,
        },
        { provide: 'IWalletRepository', useValue: mockWalletRepository },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should create a transaction', async () => {
      const data = {
        walletId: new Types.ObjectId().toString(),
        type: TransactionType.DEPOSIT,
        amount: 100,
        status: TransactionStatus.SUCCESS,
      };
      const expectedResult = { _id: new Types.ObjectId().toString(), ...data };
      mockTransactionRepository.create.mockResolvedValue(expectedResult);

      const result = await service.createTransaction(data);

      expect(result).toEqual(expectedResult);
      expect(mockTransactionRepository.create).toHaveBeenCalledWith(data);
    });
  });

  describe('getMyTransactions', () => {
    const userId = new Types.ObjectId().toString();
    const walletId = new Types.ObjectId().toString();
    const mockWallet = { _id: walletId, userId, balance: 100, heldBalance: 0 };

    it('should throw WalletNotFoundException if user has no wallet', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);
      await expect(service.getMyTransactions(userId, {})).rejects.toThrow(
        WalletNotFoundException,
      );
    });

    it('should return transactions page with default pagination', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const items = [{ _id: 'tx1' }, { _id: 'tx2' }];
      mockTransactionRepository.findByWalletId.mockResolvedValue(items);
      mockTransactionRepository.countByWalletId.mockResolvedValue(15);

      const result = await service.getMyTransactions(userId, {});

      expect(result).toEqual({
        items,
        total: 15,
        totalPages: 2, // Math.ceil(15 / 10)
        hasNextPage: true, // page(1) < totalPages(2)
      });
      expect(mockTransactionRepository.findByWalletId).toHaveBeenCalledWith(
        walletId,
        1,
        10,
        undefined,
      );
      expect(mockTransactionRepository.countByWalletId).toHaveBeenCalledWith(
        walletId,
        undefined,
      );
    });

    it('should respect provided pagination and type filter', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const items = [{ _id: 'tx1' }];
      mockTransactionRepository.findByWalletId.mockResolvedValue(items);
      mockTransactionRepository.countByWalletId.mockResolvedValue(5);

      const input = { page: 2, limit: 5, type: TransactionType.DEPOSIT };
      const result = await service.getMyTransactions(userId, input);

      expect(result).toEqual({
        items,
        total: 5,
        totalPages: 1, // Math.ceil(5 / 5)
        hasNextPage: false, // page(2) < totalPages(1) is false
      });
      expect(mockTransactionRepository.findByWalletId).toHaveBeenCalledWith(
        walletId,
        2,
        5,
        TransactionType.DEPOSIT,
      );
      expect(mockTransactionRepository.countByWalletId).toHaveBeenCalledWith(
        walletId,
        TransactionType.DEPOSIT,
      );
    });
  });
});
