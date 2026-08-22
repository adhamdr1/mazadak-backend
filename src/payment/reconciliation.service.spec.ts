import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { TransactionService } from '../transaction/transaction.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { Types } from 'mongoose';
import { PaymentProviderType } from './enums/payment-provider-type.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { Transaction } from '../transaction/entities/transaction.entity';

const mockTransactionRepository = {
  findAll: jest.fn(),
};

const mockProvider = {
  getPaymentStatus: jest.fn(),
};

const mockProviderFactory = {
  getProvider: jest.fn().mockReturnValue(mockProvider),
};

const mockTransactionService = {
  updateTransactionStatusDirect: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
  eval: jest.fn(),
};

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockConnection = {
  startSession: jest.fn().mockResolvedValue(mockSession),
};

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: 'ITransactionRepository',
          useValue: mockTransactionRepository,
        },
        {
          provide: PaymentProviderFactory,
          useValue: mockProviderFactory,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: getRedisConnectionToken('default'),
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const transactionId = new Types.ObjectId().toString();
  const walletId = new Types.ObjectId().toString();

  const mockPendingTransaction: Transaction = {
    _id: new Types.ObjectId(transactionId),
    walletId: new Types.ObjectId(walletId),
    type: TransactionType.DEPOSIT,
    amount: Types.Decimal128.fromString('50.00'),
    currency: 'EGP',
    status: TransactionStatus.PENDING,
    referenceId: null,
    referenceType: null,
    idempotencyKey: null,
    gatewayProvider: PaymentProviderType.STRIPE,
    gatewayPaymentIntentId: 'pi_12345',
    gatewayTransactionId: null,
    hasChild: false,
    walletCredited: false,
    expiresAt: null,
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
  };

  describe('reconcilePendingPayments', () => {
    it('should reconcile successful payment on gateway and mark transaction as SUCCESS', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockTransactionRepository.findAll.mockResolvedValueOnce([
        mockPendingTransaction,
      ]);
      mockProvider.getPaymentStatus.mockResolvedValue({
        status: PaymentStatus.SUCCESS,
      });
      mockTransactionService.updateTransactionStatusDirect.mockResolvedValue(
        undefined,
      );
      mockRedis.eval.mockResolvedValue(1);

      await service.reconcilePendingPayments();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'reconciliation:lock',
        expect.any(String),
        'EX',
        600,
        'NX',
      );
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith(
        PaymentProviderType.STRIPE,
      );
      expect(mockProvider.getPaymentStatus).toHaveBeenCalledWith('pi_12345');
      expect(
        mockTransactionService.updateTransactionStatusDirect,
      ).toHaveBeenCalledWith(
        transactionId,
        TransactionStatus.SUCCESS,
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should reconcile failed payment on gateway and mark transaction as FAILED', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockTransactionRepository.findAll.mockResolvedValueOnce([
        mockPendingTransaction,
      ]);
      mockProvider.getPaymentStatus.mockResolvedValue({
        status: PaymentStatus.FAILED,
      });
      mockTransactionService.updateTransactionStatusDirect.mockResolvedValue(
        undefined,
      );
      mockRedis.eval.mockResolvedValue(1);

      await service.reconcilePendingPayments();

      expect(
        mockTransactionService.updateTransactionStatusDirect,
      ).toHaveBeenCalledWith(
        transactionId,
        TransactionStatus.FAILED,
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should skip transaction if gateway status is still pending', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockTransactionRepository.findAll.mockResolvedValueOnce([
        mockPendingTransaction,
      ]);
      mockProvider.getPaymentStatus.mockResolvedValue({
        status: PaymentStatus.PENDING,
      });
      mockRedis.eval.mockResolvedValue(1);

      await service.reconcilePendingPayments();

      expect(
        mockTransactionService.updateTransactionStatusDirect,
      ).not.toHaveBeenCalled();
    });

    it('should not run if redis lock is not acquired', async () => {
      mockRedis.set.mockResolvedValue(null);

      await service.reconcilePendingPayments();

      expect(mockTransactionRepository.findAll).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should handle redis error gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection error'));

      await service.reconcilePendingPayments();

      expect(mockTransactionRepository.findAll).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should abort transaction and continue if updateTransactionStatusDirect fails', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockTransactionRepository.findAll.mockResolvedValueOnce([
        mockPendingTransaction,
      ]);
      mockProvider.getPaymentStatus.mockResolvedValue({
        status: PaymentStatus.SUCCESS,
      });
      mockTransactionService.updateTransactionStatusDirect.mockRejectedValue(
        new Error('Direct update failed'),
      );
      mockRedis.eval.mockResolvedValue(1);

      await service.reconcilePendingPayments();

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled();
    });
  });
});
