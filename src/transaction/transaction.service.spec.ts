import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { WalletNotFoundException } from '../wallet/exceptions/wallet-not-found.exception';
import { TransactionType } from './enums/transaction-type.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { Types } from 'mongoose';
import { TransactionsFilterInput } from './dto/transactions-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';

const mockTransactionRepository = {
  create: jest.fn(),
  findByWalletId: jest.fn(),
  countByWalletId: jest.fn(),
  findAll: jest.fn(),
  countAll: jest.fn(),
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
      await expect(
        service.getMyTransactions(userId, { page: 1, limit: 10 }),
      ).rejects.toThrow(WalletNotFoundException);
    });

    it('should return transactions page with default pagination', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const items = [{ _id: 'tx1' }, { _id: 'tx2' }];
      mockTransactionRepository.findByWalletId.mockResolvedValue(items);
      mockTransactionRepository.countByWalletId.mockResolvedValue(15);

      const result = await service.getMyTransactions(userId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        items,
        total: 15,
        totalPages: 2,
        hasNextPage: true,
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

    it('should respect provided pagination and filter', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(mockWallet);
      const items = [{ _id: 'tx1' }];
      mockTransactionRepository.findByWalletId.mockResolvedValue(items);
      mockTransactionRepository.countByWalletId.mockResolvedValue(5);

      const input = { page: 2, limit: 5 };
      const filter: TransactionsFilterInput = { type: TransactionType.DEPOSIT };
      const result = await service.getMyTransactions(userId, input, filter);

      expect(result).toEqual({
        items,
        total: 5,
        totalPages: 1,
        hasNextPage: false,
      });
      expect(mockTransactionRepository.findByWalletId).toHaveBeenCalledWith(
        walletId,
        2,
        5,
        filter,
      );
      expect(mockTransactionRepository.countByWalletId).toHaveBeenCalledWith(
        walletId,
        filter,
      );
    });
  });

  describe('getAllTransactions', () => {
    it('should return all transactions page with pagination and filter', async () => {
      const items = [{ _id: 'tx1' }, { _id: 'tx2' }];
      mockTransactionRepository.findAll.mockResolvedValue(items);
      mockTransactionRepository.countAll.mockResolvedValue(20);

      const input: PaginationInput = { page: 2, limit: 10 };
      const filter: TransactionsFilterInput = {
        status: TransactionStatus.SUCCESS,
      };
      const result = await service.getAllTransactions(input, filter);

      expect(result).toEqual({
        items,
        total: 20,
        totalPages: 2,
        hasNextPage: false,
      });
      expect(mockTransactionRepository.findAll).toHaveBeenCalledWith(
        2,
        10,
        filter,
      );
      expect(mockTransactionRepository.countAll).toHaveBeenCalledWith(filter);
    });
  });
});
