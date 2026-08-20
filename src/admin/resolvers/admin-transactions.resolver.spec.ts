import { Test, TestingModule } from '@nestjs/testing';
import { AdminTransactionsResolver } from './admin-transactions.resolver';
import { TransactionService } from '../../transaction/transaction.service';
import { TransactionsPage } from '../../transaction/dto/transactions-page.type';

const mockTransactionService = {
  getAllTransactions: jest.fn(),
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

  it('should return paginated transactions for admin', async () => {
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
});
