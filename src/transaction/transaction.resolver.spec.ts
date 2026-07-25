import { Test, TestingModule } from '@nestjs/testing';
import { TransactionResolver } from './transaction.resolver';
import { TransactionService } from './transaction.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { Types } from 'mongoose';
import { TransactionsFilterInput } from './dto/transactions-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';

const mockTransactionService = {
  getMyTransactions: jest.fn(),
  getAllTransactions: jest.fn(),
};

describe('TransactionResolver', () => {
  let resolver: TransactionResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionResolver,
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    resolver = module.get<TransactionResolver>(TransactionResolver);
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

  describe('myTransactions', () => {
    it('should call getMyTransactions on service and return result', async () => {
      const input: PaginationInput = { page: 1, limit: 10 };
      const filter: TransactionsFilterInput = { search: 'ref123' };
      const expectedResult = {
        items: [],
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      };
      mockTransactionService.getMyTransactions.mockResolvedValue(
        expectedResult,
      );

      const result = await resolver.myTransactions(currentUser, input, filter);

      expect(result).toEqual(expectedResult);
      expect(mockTransactionService.getMyTransactions).toHaveBeenCalledWith(
        currentUser.sub,
        input,
        filter,
      );
    });

    it('should use default empty object if input is not provided', async () => {
      const expectedResult = {
        items: [],
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      };
      mockTransactionService.getMyTransactions.mockResolvedValue(
        expectedResult,
      );

      const result = await resolver.myTransactions(currentUser);

      expect(result).toEqual(expectedResult);
      expect(mockTransactionService.getMyTransactions).toHaveBeenCalledWith(
        currentUser.sub,
        expect.objectContaining({ page: 1, limit: 10 }),
        undefined,
      );
    });
  });

  describe('transactions (admin)', () => {
    it('should call getAllTransactions on service and return result', async () => {
      const input: PaginationInput = { page: 1, limit: 10 };
      const filter: TransactionsFilterInput = { search: 'adminSearch' };
      const expectedResult = {
        items: [],
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      };
      mockTransactionService.getAllTransactions.mockResolvedValue(
        expectedResult,
      );

      const result = await resolver.transactions(input, filter);

      expect(result).toEqual(expectedResult);
      expect(mockTransactionService.getAllTransactions).toHaveBeenCalledWith(
        input,
        filter,
      );
    });
  });
});
