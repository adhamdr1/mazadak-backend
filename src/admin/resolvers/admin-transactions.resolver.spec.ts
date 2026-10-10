import { Test, TestingModule } from '@nestjs/testing';
import { AdminTransactionsResolver } from './admin-transactions.resolver';
import { TransactionService } from '../../transaction/transaction.service';
import { WalletService } from '../../wallet/wallet.service';
import { TransactionsPage } from '../../transaction/dto/transactions-page.type';

const mockTransactionService = {
  getAllTransactions: jest.fn(),
};

const mockWalletService = {
  getWalletByUserId: jest.fn(),
};

describe('AdminTransactionsResolver', () => {
  let resolver: AdminTransactionsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminTransactionsResolver,
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    resolver = module.get<AdminTransactionsResolver>(AdminTransactionsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return paginated transactions for admin without userId', async () => {
    const page: TransactionsPage = {
      items: [],
      total: 0,
      totalPages: 0,
      hasNextPage: false,
    };
    mockTransactionService.getAllTransactions.mockResolvedValue(page);

    const input = { page: 1, limit: 10 };
    const filter = {};

    const result = await resolver.adminGetTransactions(input, filter);

    expect(result).toEqual(page);
    expect(mockTransactionService.getAllTransactions).toHaveBeenCalledWith(
      input,
      filter,
    );
  });

  it('should resolve userId to walletId for admin transactions query', async () => {
    const page: TransactionsPage = {
      items: [],
      total: 1,
      totalPages: 1,
      hasNextPage: false,
    };
    mockTransactionService.getAllTransactions.mockResolvedValue(page);
    mockWalletService.getWalletByUserId.mockResolvedValue({
      _id: { toString: () => 'wallet-123' },
    });

    const input = { page: 1, limit: 10 };
    const filter = { userId: 'user-456' };

    const result = await resolver.adminGetTransactions(input, filter);

    expect(result).toEqual(page);
    expect(mockWalletService.getWalletByUserId).toHaveBeenCalledWith(
      'user-456',
    );
    expect(mockTransactionService.getAllTransactions).toHaveBeenCalledWith(
      input,
      { userId: 'user-456', walletId: 'wallet-123' },
    );
  });

  it('should return empty page if user wallet is not found', async () => {
    mockWalletService.getWalletByUserId.mockRejectedValue(
      new Error('Wallet not found'),
    );

    const input = { page: 1, limit: 10 };
    const filter = { userId: 'non-existent' };

    const result = await resolver.adminGetTransactions(input, filter);

    expect(result).toEqual({
      items: [],
      total: 0,
      totalPages: 0,
      hasNextPage: false,
    });
    expect(mockTransactionService.getAllTransactions).not.toHaveBeenCalled();
  });
});
