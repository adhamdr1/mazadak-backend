import { Test, TestingModule } from '@nestjs/testing';
import { PaymentExpirationService } from './payment-expiration.service';
import { TransactionService } from '../transaction/transaction.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { Types } from 'mongoose';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { Transaction } from '../transaction/entities/transaction.entity';

const mockTransactionRepository = {
  findAll: jest.fn(),
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

describe('PaymentExpirationService', () => {
  let service: PaymentExpirationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentExpirationService,
        {
          provide: 'ITransactionRepository',
          useValue: mockTransactionRepository,
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

    service = module.get<PaymentExpirationService>(PaymentExpirationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const transactionId = new Types.ObjectId().toString();
  const walletId = new Types.ObjectId().toString();

  const mockExpiredTransaction: Transaction = {
    _id: new Types.ObjectId(transactionId),
    walletId: new Types.ObjectId(walletId),
    type: TransactionType.DEPOSIT,
    amount: Types.Decimal128.fromString('50.00'),
    currency: 'EGP',
    status: TransactionStatus.PENDING,
    referenceId: null,
    referenceType: null,
    idempotencyKey: null,
    gatewayProvider: null,
    gatewayPaymentIntentId: null,
    gatewayTransactionId: null,
    hasChild: false,
    walletCredited: false,
    expiresAt: new Date(Date.now() - 10000),
    createdAt: new Date(),
  };

  describe('handleExpiredPayments', () => {
    it('should acquire lock and mark expired pending deposits as EXPIRED', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockTransactionRepository.findAll.mockResolvedValueOnce([
        mockExpiredTransaction,
      ]);
      mockTransactionService.updateTransactionStatusDirect.mockResolvedValue(
        undefined,
      );
      mockRedis.eval.mockResolvedValue(1);

      await service.handleExpiredPayments();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'payment:expiration:lock',
        expect.any(String),
        'EX',
        30,
        'NX',
      );
      expect(mockTransactionRepository.findAll).toHaveBeenCalledWith(
        1,
        100,
        expect.objectContaining({
          status: TransactionStatus.PENDING,
          type: TransactionType.DEPOSIT,
          hasChild: false,
        }),
      );
      expect(
        mockTransactionService.updateTransactionStatusDirect,
      ).toHaveBeenCalledWith(
        transactionId,
        TransactionStatus.EXPIRED,
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should not process if lock is not acquired', async () => {
      mockRedis.set.mockResolvedValue(null);

      await service.handleExpiredPayments();

      expect(mockTransactionRepository.findAll).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should handle redis error gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection error'));

      await service.handleExpiredPayments();

      expect(mockTransactionRepository.findAll).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should abort transaction and continue if updateTransactionStatusDirect throws', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockTransactionRepository.findAll.mockResolvedValueOnce([
        mockExpiredTransaction,
      ]);
      mockTransactionService.updateTransactionStatusDirect.mockRejectedValue(
        new Error('DB update error'),
      );
      mockRedis.eval.mockResolvedValue(1);

      await service.handleExpiredPayments();

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled();
    });
  });
});
