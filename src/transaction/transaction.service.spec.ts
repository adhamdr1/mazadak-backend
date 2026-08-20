import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { TransactionType } from './enums/transaction-type.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { ClientSession, Types } from 'mongoose';
import { TransactionsFilterInput } from './dto/transactions-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { Transaction } from './entities/transaction.entity';

const mockTransactionRepository = {
  create: jest.fn(),
  findByWalletId: jest.fn(),
  countByWalletId: jest.fn(),
  findAll: jest.fn(),
  countAll: jest.fn(),
  findById: jest.fn(),
  markHasChild: jest.fn(),
  updateGatewayPaymentIntentId: jest.fn(),
  markWalletCredited: jest.fn(),
  sumTodayRevenue: jest.fn(),
};

const mockOutboxService = {
  saveEvent: jest.fn(),
};

const mockSession = {} as ClientSession;

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
        { provide: OutboxService, useValue: mockOutboxService },
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
    it('should create a transaction and mark hasChild if referenceId is provided', async () => {
      const parentId = new Types.ObjectId().toString();
      const data = {
        walletId: new Types.ObjectId().toString(),
        type: TransactionType.DEPOSIT,
        amount: 100,
        currency: 'EGP',
        status: TransactionStatus.SUCCESS,
        referenceId: parentId,
      };
      const expectedResult = {
        _id: new Types.ObjectId().toString(),
        ...data,
      } as unknown as Transaction;
      mockTransactionRepository.create.mockResolvedValue(expectedResult);
      mockTransactionRepository.markHasChild.mockResolvedValue(undefined);

      const result = await service.createTransaction(data, mockSession);

      expect(result).toEqual(expectedResult);
      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        data,
        mockSession,
      );
      expect(mockTransactionRepository.markHasChild).toHaveBeenCalledWith(
        parentId,
        mockSession,
      );
    });
  });

  describe('updateGatewayPaymentIntentId', () => {
    it('should update gateway payment intent id if valid objectId', async () => {
      const id = new Types.ObjectId().toString();
      const expected = { _id: id } as unknown as Transaction;
      mockTransactionRepository.updateGatewayPaymentIntentId.mockResolvedValue(
        expected,
      );

      const result = await service.updateGatewayPaymentIntentId(
        id,
        'pi_123',
        mockSession,
      );

      expect(result).toEqual(expected);
      expect(
        mockTransactionRepository.updateGatewayPaymentIntentId,
      ).toHaveBeenCalledWith(id, 'pi_123', mockSession);
    });

    it('should return null if id is invalid', async () => {
      const result = await service.updateGatewayPaymentIntentId(
        'invalid-id',
        'pi_123',
      );

      expect(result).toBeNull();
      expect(
        mockTransactionRepository.updateGatewayPaymentIntentId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findByIdWithinSession', () => {
    it('should find transaction within session if valid id', async () => {
      const id = new Types.ObjectId().toString();
      const expected = { _id: id } as unknown as Transaction;
      mockTransactionRepository.findById.mockResolvedValue(expected);

      const result = await service.findByIdWithinSession(id, mockSession);

      expect(result).toEqual(expected);
      expect(mockTransactionRepository.findById).toHaveBeenCalledWith(
        id,
        mockSession,
      );
    });

    it('should return null if id is invalid', async () => {
      const result = await service.findByIdWithinSession('invalid-id');

      expect(result).toBeNull();
      expect(mockTransactionRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('markWalletCredited', () => {
    it('should mark wallet credited if valid id', async () => {
      const id = new Types.ObjectId().toString();
      const expected = { _id: id } as unknown as Transaction;
      mockTransactionRepository.markWalletCredited.mockResolvedValue(expected);

      const result = await service.markWalletCredited(id, mockSession);

      expect(result).toEqual(expected);
      expect(mockTransactionRepository.markWalletCredited).toHaveBeenCalledWith(
        id,
        mockSession,
      );
    });

    it('should return null if id is invalid', async () => {
      const result = await service.markWalletCredited('invalid-id');

      expect(result).toBeNull();
      expect(
        mockTransactionRepository.markWalletCredited,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getTransactionsByWalletId', () => {
    const walletId = new Types.ObjectId().toString();

    it('should return transactions page with default pagination', async () => {
      const items = [{ _id: 'tx1' }];
      mockTransactionRepository.findByWalletId.mockResolvedValue(items);
      mockTransactionRepository.countByWalletId.mockResolvedValue(15);

      const result = await service.getTransactionsByWalletId(walletId, {
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
      const items = [{ _id: 'tx1' }];
      mockTransactionRepository.findByWalletId.mockResolvedValue(items);
      mockTransactionRepository.countByWalletId.mockResolvedValue(5);

      const input = { page: 2, limit: 5 };
      const filter: TransactionsFilterInput = { type: TransactionType.DEPOSIT };
      const result = await service.getTransactionsByWalletId(
        walletId,
        input,
        filter,
      );

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

  describe('countTransactions and sumTodayRevenue', () => {
    it('should count transactions with filter', async () => {
      mockTransactionRepository.countAll.mockResolvedValue(42);

      const filter: TransactionsFilterInput = {
        status: TransactionStatus.SUCCESS,
      };
      const result = await service.countTransactions(filter);

      expect(result).toBe(42);
      expect(mockTransactionRepository.countAll).toHaveBeenCalledWith(filter);
    });

    it('should sum today revenue', async () => {
      mockTransactionRepository.sumTodayRevenue.mockResolvedValue(12345);

      const result = await service.sumTodayRevenue();

      expect(result).toBe(12345);
      expect(mockTransactionRepository.sumTodayRevenue).toHaveBeenCalled();
    });
  });

  describe('updateTransactionStatusAndEmitOutbox', () => {
    const txId = new Types.ObjectId().toString();

    it('should throw TransactionNotFoundException if transaction does not exist', async () => {
      mockTransactionRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateTransactionStatusAndEmitOutbox(
          txId,
          TransactionStatus.SUCCESS,
          1000,
          'EGP',
          mockSession,
        ),
      ).rejects.toThrow('TRANSACTION_NOT_FOUND');
    });

    it('should throw TransactionNotFoundException if transaction id is invalid', async () => {
      await expect(
        service.updateTransactionStatusAndEmitOutbox(
          'invalid-id',
          TransactionStatus.SUCCESS,
          1000,
          'EGP',
          mockSession,
        ),
      ).rejects.toThrow('TRANSACTION_NOT_FOUND');
    });

    it('should return early if transaction hasChild is true', async () => {
      mockTransactionRepository.findById.mockResolvedValue({
        _id: txId,
        status: TransactionStatus.SUCCESS,
        hasChild: true,
      });

      await service.updateTransactionStatusAndEmitOutbox(
        txId,
        TransactionStatus.SUCCESS,
        1000,
        'EGP',
        mockSession,
      );

      expect(mockTransactionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw TransactionAmountMismatchException if amount mismatch', async () => {
      mockTransactionRepository.findById.mockResolvedValue({
        _id: txId,
        status: TransactionStatus.PENDING,
        amount: 50,
        currency: 'EGP',
      });

      await expect(
        service.updateTransactionStatusAndEmitOutbox(
          txId,
          TransactionStatus.SUCCESS,
          1000, // 10 EGP != 50 EGP
          'EGP',
          mockSession,
        ),
      ).rejects.toThrow('TRANSACTION_AMOUNT_MISMATCH');
    });

    it('should throw TransactionCurrencyMismatchException if currency mismatch', async () => {
      mockTransactionRepository.findById.mockResolvedValue({
        _id: txId,
        status: TransactionStatus.PENDING,
        amount: 10,
        currency: 'EGP',
      });

      await expect(
        service.updateTransactionStatusAndEmitOutbox(
          txId,
          TransactionStatus.SUCCESS,
          1000,
          'USD',
          mockSession,
        ),
      ).rejects.toThrow('TRANSACTION_CURRENCY_MISMATCH');
    });

    it('should return early if duplicate key mongo error (11000) occurs', async () => {
      mockTransactionRepository.findById.mockResolvedValue({
        _id: txId,
        walletId: new Types.ObjectId(),
        type: TransactionType.DEPOSIT,
        amount: 10,
        currency: 'EGP',
        status: TransactionStatus.PENDING,
      });
      const mongoError = new Error('Duplicate key') as Error & { code: number };
      mongoError.code = 11000;
      mockTransactionRepository.create.mockRejectedValue(mongoError);

      await service.updateTransactionStatusAndEmitOutbox(
        txId,
        TransactionStatus.SUCCESS,
        1000,
        'EGP',
        mockSession,
      );

      expect(mockOutboxService.saveEvent).not.toHaveBeenCalled();
    });

    it('should create success transition and save outbox event for successful deposit', async () => {
      const walletId = new Types.ObjectId();
      const transactionId = new Types.ObjectId();
      mockTransactionRepository.findById.mockResolvedValue({
        _id: transactionId,
        walletId,
        type: TransactionType.DEPOSIT,
        amount: 10,
        currency: 'EGP',
        status: TransactionStatus.PENDING,
      });

      mockTransactionRepository.create.mockResolvedValue({});

      await service.updateTransactionStatusAndEmitOutbox(
        transactionId.toString(),
        TransactionStatus.SUCCESS,
        1000,
        'EGP',
        mockSession,
      );

      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId: walletId.toString(),
          status: TransactionStatus.SUCCESS,
          referenceId: transactionId.toString(),
        }),
        mockSession,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledWith(
        RabbitMQEvent.WalletDepositInitiated,
        {
          walletId: walletId.toString(),
          amount: 10,
          transactionId: transactionId.toString(),
        },
        mockSession,
        transactionId.toString(),
      );
    });
  });
});
