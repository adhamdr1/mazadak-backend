import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WithdrawalsService } from './withdrawals.service';
import { WalletService } from '../wallet/wallet.service';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { WithdrawalStatus } from './enums/withdrawal-status.enum';
import { PayoutMethod } from './enums/payout-method.enum';
import {
  WithdrawalBelowMinimumException,
  PayoutMethodAmountExceededException,
  DailyWithdrawalLimitReachedException,
  InvalidPayoutDetailsException,
  WithdrawalNotFoundException,
  WithdrawalNotCancellableException,
  WithdrawalNotPendingException,
  WithdrawalNotInProgressException,
  WithdrawalNotRejectableException,
} from './exceptions';
import { InsufficientFundsException } from '../wallet/exceptions/insufficient-funds.exception';
import { AdminAdjustBalanceType } from '../admin/dto';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { PayoutDetailsInput } from './dto/payout-details.input';

describe('WithdrawalsService', () => {
  let service: WithdrawalsService;

  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue(mockSession),
  };

  const mockWithdrawalRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    hasRequestToday: jest.fn(),
    transitionStatus: jest.fn(),
    updateStatus: jest.fn(),
    countPendingWithdrawals: jest.fn(),
    sumPendingWithdrawals: jest.fn(),
    sumCompletedWithdrawals: jest.fn(),
    sumCollectedFees: jest.fn(),
  };

  const mockWalletService = {
    getMyWallet: jest.fn(),
    hold: jest.fn(),
    release: jest.fn(),
    capture: jest.fn(),
    deposit: jest.fn(),
    withdraw: jest.fn(),
  };

  const mockOutboxService = {
    saveEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockRealtimeService = {
    publishWithdrawalRequested: jest.fn().mockResolvedValue(undefined),
    publishWithdrawalStatusChanged: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal: unknown) => {
      if (key === 'WITHDRAWAL_FEE_PERCENTAGE') return 2;
      return defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalsService,
        {
          provide: 'IWithdrawalRepository',
          useValue: mockWithdrawalRepository,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: RealtimeService,
          useValue: mockRealtimeService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<WithdrawalsService>(WithdrawalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateFee', () => {
    it('should calculate 2% fee correctly for Bank Account with 10M limit', () => {
      const result = service.calculateFee(1000, PayoutMethod.BANK_ACCOUNT);
      expect(result).toEqual({
        requestedAmount: '1000.00',
        fee: '20.00',
        feePercentage: 2,
        netAmount: '980.00',
        maxAllowed: 10_000_000,
        estimatedDelivery: '3-5 business days',
      });
    });

    it('should calculate fee correctly for Mobile Wallet with 50k limit', () => {
      const result = service.calculateFee(500, PayoutMethod.VODAFONE_CASH);
      expect(result).toEqual({
        requestedAmount: '500.00',
        fee: '10.00',
        feePercentage: 2,
        netAmount: '490.00',
        maxAllowed: 50_000,
        estimatedDelivery: 'Within 24 business hours',
      });
    });
  });

  describe('requestWithdrawal', () => {
    const userId = new Types.ObjectId().toString();
    const mockWallet = { balance: 5000, heldBalance: 500 };

    it('should throw InvalidPayoutDetailsException when payoutDetails is missing', async () => {
      await expect(
        service.requestWithdrawal(userId, {
          amount: 100,
          payoutMethod: PayoutMethod.BANK_ACCOUNT,
          payoutDetails: undefined as unknown as PayoutDetailsInput,
        }),
      ).rejects.toThrow(InvalidPayoutDetailsException);
    });

    it('should throw InvalidPayoutDetailsException when bank details are incomplete', async () => {
      await expect(
        service.requestWithdrawal(userId, {
          amount: 100,
          payoutMethod: PayoutMethod.BANK_ACCOUNT,
          payoutDetails: { bankName: '', accountHolderName: 'Ahmed' },
        }),
      ).rejects.toThrow(InvalidPayoutDetailsException);

      await expect(
        service.requestWithdrawal(userId, {
          amount: 100,
          payoutMethod: PayoutMethod.BANK_ACCOUNT,
          payoutDetails: {
            bankName: 'CIB',
            accountHolderName: 'Ahmed',
            accountNumber: '',
            iban: '',
          },
        }),
      ).rejects.toThrow(InvalidPayoutDetailsException);
    });

    it('should throw InvalidPayoutDetailsException when InstaPay details are missing both phone and IPA', async () => {
      await expect(
        service.requestWithdrawal(userId, {
          amount: 100,
          payoutMethod: PayoutMethod.INSTAPAY,
          payoutDetails: {},
        }),
      ).rejects.toThrow(InvalidPayoutDetailsException);
    });

    it('should throw InvalidPayoutDetailsException when mobile wallet phone number is missing', async () => {
      await expect(
        service.requestWithdrawal(userId, {
          amount: 100,
          payoutMethod: PayoutMethod.VODAFONE_CASH,
          payoutDetails: {},
        }),
      ).rejects.toThrow(InvalidPayoutDetailsException);
    });

    it('should throw WithdrawalBelowMinimumException when amount is less than 50', async () => {
      await expect(
        service.requestWithdrawal(userId, {
          amount: 49,
          payoutMethod: PayoutMethod.VODAFONE_CASH,
          payoutDetails: { phoneNumber: '01012345678' },
        }),
      ).rejects.toThrow(WithdrawalBelowMinimumException);
    });

    it('should throw PayoutMethodAmountExceededException when amount exceeds method limit', async () => {
      await expect(
        service.requestWithdrawal(userId, {
          amount: 50001,
          payoutMethod: PayoutMethod.VODAFONE_CASH,
          payoutDetails: { phoneNumber: '01012345678' },
        }),
      ).rejects.toThrow(PayoutMethodAmountExceededException);
    });

    it('should throw InsufficientFundsException when available balance is insufficient', async () => {
      mockWalletService.getMyWallet.mockResolvedValue({
        balance: 1000,
        heldBalance: 900,
      });

      await expect(
        service.requestWithdrawal(userId, {
          amount: 200,
          payoutMethod: PayoutMethod.VODAFONE_CASH,
          payoutDetails: { phoneNumber: '01012345678' },
        }),
      ).rejects.toThrow(InsufficientFundsException);
    });

    it('should throw DailyWithdrawalLimitReachedException when user already has request today', async () => {
      mockWalletService.getMyWallet.mockResolvedValue(mockWallet);
      mockWithdrawalRepository.hasRequestToday.mockResolvedValue(true);

      await expect(
        service.requestWithdrawal(userId, {
          amount: 200,
          payoutMethod: PayoutMethod.VODAFONE_CASH,
          payoutDetails: { phoneNumber: '01012345678' },
        }),
      ).rejects.toThrow(DailyWithdrawalLimitReachedException);
    });

    it('should successfully create withdrawal request and commit transaction', async () => {
      mockWalletService.getMyWallet.mockResolvedValue(mockWallet);
      mockWithdrawalRepository.hasRequestToday.mockResolvedValue(false);

      const holdTxId = new Types.ObjectId();
      mockWalletService.hold.mockResolvedValue({
        transaction: { _id: holdTxId },
      });

      const mockCreated = {
        _id: new Types.ObjectId(),
        userId,
        amount: 500,
        fee: 10,
        feePercentage: 2,
        netAmount: 490,
        currency: 'EGP',
        payoutMethod: PayoutMethod.VODAFONE_CASH,
        status: WithdrawalStatus.PENDING,
      };
      mockWithdrawalRepository.create.mockResolvedValue(mockCreated);

      const result = await service.requestWithdrawal(userId, {
        amount: 500,
        payoutMethod: PayoutMethod.VODAFONE_CASH,
        payoutDetails: { phoneNumber: '01012345678' },
      });

      expect(result).toEqual(mockCreated);
      expect(mockWalletService.hold).toHaveBeenCalledWith(
        userId,
        500,
        undefined,
        mockSession,
        expect.any(String),
      );
      expect(mockWithdrawalRepository.create).toHaveBeenCalled();
      expect(mockOutboxService.saveEvent).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(
        mockRealtimeService.publishWithdrawalRequested,
      ).toHaveBeenCalledWith(mockCreated);
    });

    it('should catch Mongo duplicate error (11000) and throw DailyWithdrawalLimitReachedException', async () => {
      mockWalletService.getMyWallet.mockResolvedValue(mockWallet);
      mockWithdrawalRepository.hasRequestToday.mockResolvedValue(false);
      mockWalletService.hold.mockResolvedValue({
        transaction: { _id: new Types.ObjectId() },
      });
      mockWithdrawalRepository.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.requestWithdrawal(userId, {
          amount: 500,
          payoutMethod: PayoutMethod.VODAFONE_CASH,
          payoutDetails: { phoneNumber: '01012345678' },
        }),
      ).rejects.toThrow(DailyWithdrawalLimitReachedException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe('cancelWithdrawal', () => {
    const userId = new Types.ObjectId().toString();
    const requestId = new Types.ObjectId().toString();

    it('should successfully cancel pending withdrawal and release held balance', async () => {
      const mockCancelled = {
        _id: requestId,
        userId,
        amount: 500,
        status: WithdrawalStatus.CANCELLED,
      };

      mockWithdrawalRepository.transitionStatus.mockResolvedValue(
        mockCancelled,
      );

      const result = await service.cancelWithdrawal(userId, requestId);

      expect(result).toEqual(mockCancelled);
      expect(mockWithdrawalRepository.transitionStatus).toHaveBeenCalledWith(
        requestId,
        [WithdrawalStatus.PENDING],
        WithdrawalStatus.CANCELLED,
        {},
        mockSession,
        { userId },
      );
      expect(mockWalletService.release).toHaveBeenCalledWith(
        userId,
        500,
        requestId,
        mockSession,
        expect.any(String),
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(
        mockRealtimeService.publishWithdrawalStatusChanged,
      ).toHaveBeenCalledWith(mockCancelled);
    });

    it('should throw WithdrawalNotFoundException if request does not exist or wrong user', async () => {
      mockWithdrawalRepository.transitionStatus.mockResolvedValue(null);
      mockWithdrawalRepository.findById.mockResolvedValue(null);

      await expect(service.cancelWithdrawal(userId, requestId)).rejects.toThrow(
        WithdrawalNotFoundException,
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should throw WithdrawalNotCancellableException if request exists but not in PENDING status', async () => {
      mockWithdrawalRepository.transitionStatus.mockResolvedValue(null);
      mockWithdrawalRepository.findById.mockResolvedValue({
        _id: requestId,
        userId,
        status: WithdrawalStatus.PROCESSING,
      });

      await expect(service.cancelWithdrawal(userId, requestId)).rejects.toThrow(
        WithdrawalNotCancellableException,
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe('getMyWithdrawals & getMyWithdrawal', () => {
    const userId = new Types.ObjectId().toString();
    const requestId = new Types.ObjectId().toString();

    it('getMyWithdrawals should delegate to repository', async () => {
      const mockPage = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockWithdrawalRepository.findByUserId.mockResolvedValue(mockPage);

      const result = await service.getMyWithdrawals(userId, {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockPage);
      expect(mockWithdrawalRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        { page: 1, limit: 10 },
        undefined,
      );
    });

    it('getMyWithdrawal should throw WithdrawalNotFoundException if not found or belongs to another user', async () => {
      mockWithdrawalRepository.findById.mockResolvedValue(null);
      await expect(service.getMyWithdrawal(userId, requestId)).rejects.toThrow(
        WithdrawalNotFoundException,
      );

      mockWithdrawalRepository.findById.mockResolvedValue({
        _id: requestId,
        userId: 'other_user',
      });
      await expect(service.getMyWithdrawal(userId, requestId)).rejects.toThrow(
        WithdrawalNotFoundException,
      );
    });

    it('getMyWithdrawal should return request if found and user matches', async () => {
      const mockReq = { _id: requestId, userId };
      mockWithdrawalRepository.findById.mockResolvedValue(mockReq);

      const result = await service.getMyWithdrawal(userId, requestId);
      expect(result).toEqual(mockReq);
    });
  });

  describe('adminStartProcessing', () => {
    const adminId = new Types.ObjectId().toString();
    const requestId = new Types.ObjectId().toString();

    it('should successfully transition PENDING to PROCESSING', async () => {
      const mockUpdated = {
        _id: requestId,
        status: WithdrawalStatus.PROCESSING,
        processedBy: adminId,
      };
      mockWithdrawalRepository.transitionStatus.mockResolvedValue(mockUpdated);

      const result = await service.adminStartProcessing(adminId, requestId);

      expect(result).toEqual(mockUpdated);
      expect(mockWithdrawalRepository.transitionStatus).toHaveBeenCalledWith(
        requestId,
        [WithdrawalStatus.PENDING],
        WithdrawalStatus.PROCESSING,
        expect.anything(),
      );
      expect(
        mockRealtimeService.publishWithdrawalStatusChanged,
      ).toHaveBeenCalledWith(mockUpdated);
    });

    it('should throw WithdrawalNotFoundException if request does not exist', async () => {
      mockWithdrawalRepository.transitionStatus.mockResolvedValue(null);
      mockWithdrawalRepository.findById.mockResolvedValue(null);

      await expect(
        service.adminStartProcessing(adminId, requestId),
      ).rejects.toThrow(WithdrawalNotFoundException);
    });

    it('should throw WithdrawalNotPendingException if request exists but not PENDING', async () => {
      mockWithdrawalRepository.transitionStatus.mockResolvedValue(null);
      mockWithdrawalRepository.findById.mockResolvedValue({
        _id: requestId,
        status: WithdrawalStatus.PROCESSING,
      });

      await expect(
        service.adminStartProcessing(adminId, requestId),
      ).rejects.toThrow(WithdrawalNotPendingException);
    });
  });

  describe('adminCompleteWithdrawal', () => {
    const adminId = new Types.ObjectId().toString();
    const requestId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should successfully complete withdrawal, capture balance, and record outbox event', async () => {
      const mockUpdated = {
        _id: new Types.ObjectId(requestId),
        userId: new Types.ObjectId(userId),
        amount: 1000,
        netAmount: 980,
        payoutMethod: PayoutMethod.BANK_ACCOUNT,
        status: WithdrawalStatus.COMPLETED,
      };

      mockWithdrawalRepository.transitionStatus.mockResolvedValue(mockUpdated);
      const captureTxId = new Types.ObjectId();
      mockWalletService.capture.mockResolvedValue({
        transaction: { _id: captureTxId },
      });
      mockWithdrawalRepository.updateStatus.mockResolvedValue({
        ...mockUpdated,
        completionTransactionId: captureTxId,
      });

      const result = await service.adminCompleteWithdrawal(adminId, {
        withdrawalId: requestId,
        adminReference: 'BANK-REF-12345',
        receiptUrl: 'https://cdn.example.com/receipt.pdf',
      });

      expect(result.status).toEqual(WithdrawalStatus.COMPLETED);
      expect(mockWalletService.capture).toHaveBeenCalledWith(
        userId,
        1000,
        requestId,
        mockSession,
        expect.any(String),
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(
        mockRealtimeService.publishWithdrawalStatusChanged,
      ).toHaveBeenCalled();
    });

    it('should throw WithdrawalNotInProgressException if request not PROCESSING or PENDING', async () => {
      mockWithdrawalRepository.transitionStatus.mockResolvedValue(null);
      mockWithdrawalRepository.findById.mockResolvedValue({
        _id: requestId,
        status: WithdrawalStatus.COMPLETED,
      });

      await expect(
        service.adminCompleteWithdrawal(adminId, {
          withdrawalId: requestId,
          adminReference: 'BANK-REF-123',
          receiptUrl: 'https://cdn.example.com/receipt.pdf',
        }),
      ).rejects.toThrow(WithdrawalNotInProgressException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe('adminRejectWithdrawal', () => {
    const adminId = new Types.ObjectId().toString();
    const requestId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should successfully reject withdrawal, release balance, and record outbox event', async () => {
      const mockUpdated = {
        _id: new Types.ObjectId(requestId),
        userId: new Types.ObjectId(userId),
        amount: 750,
        status: WithdrawalStatus.REJECTED,
      };

      mockWithdrawalRepository.transitionStatus.mockResolvedValue(mockUpdated);

      const result = await service.adminRejectWithdrawal(adminId, {
        withdrawalId: requestId,
        rejectionReason: 'Invalid IBAN number',
      });

      expect(result).toEqual(mockUpdated);
      expect(mockWalletService.release).toHaveBeenCalledWith(
        userId,
        750,
        requestId,
        mockSession,
        expect.any(String),
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(
        mockRealtimeService.publishWithdrawalStatusChanged,
      ).toHaveBeenCalledWith(mockUpdated);
    });

    it('should throw WithdrawalNotRejectableException if request not PENDING or PROCESSING', async () => {
      mockWithdrawalRepository.transitionStatus.mockResolvedValue(null);
      mockWithdrawalRepository.findById.mockResolvedValue({
        _id: requestId,
        status: WithdrawalStatus.COMPLETED,
      });

      await expect(
        service.adminRejectWithdrawal(adminId, {
          withdrawalId: requestId,
          rejectionReason: 'Already done',
        }),
      ).rejects.toThrow(WithdrawalNotRejectableException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe('adminAdjustBalance', () => {
    const adminId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should call walletService.deposit with ADMIN_CREDIT for CREDIT type', async () => {
      mockWalletService.deposit.mockResolvedValue({
        wallet: { balance: 1500 },
      });

      const result = await service.adminAdjustBalance(adminId, {
        userId,
        amount: 500,
        type: AdminAdjustBalanceType.CREDIT,
        reason: 'Compensatory adjustment for dispute #42',
      });

      expect(result).toEqual({ balance: 1500 });
      expect(mockWalletService.deposit).toHaveBeenCalledWith(
        userId,
        500,
        expect.stringContaining(adminId),
        undefined,
        'EGP',
        expect.any(String),
        TransactionType.ADMIN_CREDIT,
      );
    });

    it('should call walletService.withdraw with ADMIN_DEBIT for DEBIT type', async () => {
      mockWalletService.withdraw.mockResolvedValue({
        wallet: { balance: 1000 },
      });

      const result = await service.adminAdjustBalance(adminId, {
        userId,
        amount: 200,
        type: AdminAdjustBalanceType.DEBIT,
        reason: 'Manual debit correction',
      });

      expect(result).toEqual({ balance: 1000 });
      expect(mockWalletService.withdraw).toHaveBeenCalledWith(
        userId,
        200,
        expect.stringContaining(adminId),
        undefined,
        expect.any(String),
        TransactionType.ADMIN_DEBIT,
      );
    });
  });

  describe('treasury aggregator methods', () => {
    it('should delegate countPendingWithdrawals and sum methods to repository', async () => {
      mockWithdrawalRepository.countPendingWithdrawals.mockResolvedValue(7);
      mockWithdrawalRepository.sumPendingWithdrawals.mockResolvedValue(25000);
      mockWithdrawalRepository.sumCompletedWithdrawals.mockResolvedValue(
        120000,
      );
      mockWithdrawalRepository.sumCollectedFees.mockResolvedValue(1800);

      expect(await service.countPendingWithdrawals()).toBe(7);
      expect(await service.sumPendingWithdrawals()).toBe(25000);
      expect(await service.sumCompletedWithdrawals()).toBe(120000);
      expect(await service.sumCollectedFees()).toBe(1800);
    });
  });
});
