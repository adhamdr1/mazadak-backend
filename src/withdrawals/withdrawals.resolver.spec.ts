import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WithdrawalsResolver } from './withdrawals.resolver';
import { WithdrawalsService } from './withdrawals.service';
import { PUB_SUB } from '../infrastructure/pubsub/pubsub.provider';
import { PUB_SUB_EVENTS } from '../infrastructure/pubsub/events.constants';
import { PayoutMethod } from './enums/payout-method.enum';
import { WithdrawalStatus } from './enums/withdrawal-status.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

describe('WithdrawalsResolver', () => {
  let resolver: WithdrawalsResolver;

  const mockWithdrawalsService = {
    calculateFee: jest.fn(),
    getMyWithdrawals: jest.fn(),
    getMyWithdrawal: jest.fn(),
    requestWithdrawal: jest.fn(),
    cancelWithdrawal: jest.fn(),
  };

  const mockPubSub = {
    asyncIterableIterator: jest.fn(),
  };

  const currentUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    role: UserRole.USER,
    email: 'user@mazadak.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalsResolver,
        {
          provide: WithdrawalsService,
          useValue: mockWithdrawalsService,
        },
        {
          provide: PUB_SUB,
          useValue: mockPubSub,
        },
      ],
    }).compile();

    resolver = module.get<WithdrawalsResolver>(WithdrawalsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('withdrawalFeePreview', () => {
    it('should return fee preview from service', () => {
      const mockPreview = {
        requestedAmount: '1000.00',
        fee: '20.00',
        feePercentage: 2,
        netAmount: '980.00',
        maxAllowed: 10_000_000,
        estimatedDelivery: '3-5 business days',
      };
      mockWithdrawalsService.calculateFee.mockReturnValue(mockPreview);

      const result = resolver.withdrawalFeePreview(
        1000,
        PayoutMethod.BANK_ACCOUNT,
      );

      expect(result).toEqual(mockPreview);
      expect(mockWithdrawalsService.calculateFee).toHaveBeenCalledWith(
        1000,
        PayoutMethod.BANK_ACCOUNT,
      );
    });
  });

  describe('myWithdrawals', () => {
    it('should return paginated user withdrawals', async () => {
      const mockPage = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockWithdrawalsService.getMyWithdrawals.mockResolvedValue(mockPage);

      const result = await resolver.myWithdrawals(
        currentUser,
        { page: 1, limit: 10 },
        { status: WithdrawalStatus.PENDING },
      );

      expect(result).toEqual(mockPage);
      expect(mockWithdrawalsService.getMyWithdrawals).toHaveBeenCalledWith(
        currentUser.sub,
        { page: 1, limit: 10 },
        { status: WithdrawalStatus.PENDING },
      );
    });
  });

  describe('myWithdrawal', () => {
    it('should return single withdrawal by ID', async () => {
      const requestId = new Types.ObjectId().toString();
      const mockRequest = { _id: requestId, userId: currentUser.sub };
      mockWithdrawalsService.getMyWithdrawal.mockResolvedValue(mockRequest);

      const result = await resolver.myWithdrawal(currentUser, requestId);

      expect(result).toEqual(mockRequest);
      expect(mockWithdrawalsService.getMyWithdrawal).toHaveBeenCalledWith(
        currentUser.sub,
        requestId,
      );
    });
  });

  describe('requestWithdrawal', () => {
    it('should submit request to service', async () => {
      const input = {
        amount: 500,
        payoutMethod: PayoutMethod.VODAFONE_CASH,
        payoutDetails: { phoneNumber: '01012345678' },
      };
      const mockCreated = { _id: 'w1', ...input, userId: currentUser.sub };
      mockWithdrawalsService.requestWithdrawal.mockResolvedValue(mockCreated);

      const result = await resolver.requestWithdrawal(currentUser, input);

      expect(result).toEqual(mockCreated);
      expect(mockWithdrawalsService.requestWithdrawal).toHaveBeenCalledWith(
        currentUser.sub,
        input,
      );
    });
  });

  describe('cancelWithdrawal', () => {
    it('should cancel withdrawal via service', async () => {
      const requestId = new Types.ObjectId().toString();
      const mockCancelled = {
        _id: requestId,
        status: WithdrawalStatus.CANCELLED,
      };
      mockWithdrawalsService.cancelWithdrawal.mockResolvedValue(mockCancelled);

      const result = await resolver.cancelWithdrawal(currentUser, requestId);

      expect(result).toEqual(mockCancelled);
      expect(mockWithdrawalsService.cancelWithdrawal).toHaveBeenCalledWith(
        currentUser.sub,
        requestId,
      );
    });
  });

  describe('myWithdrawalUpdated subscription', () => {
    it('should return asyncIterator when user is authenticated', () => {
      const mockIterator = Symbol('asyncIterator');
      mockPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = resolver.myWithdrawalUpdated(currentUser);

      expect(result).toBe(mockIterator);
      expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        PUB_SUB_EVENTS.WITHDRAWAL_STATUS_CHANGED,
      );
    });

    it('should throw UnauthorizedException if user is missing', () => {
      expect(() =>
        resolver.myWithdrawalUpdated(undefined as unknown as JwtPayload),
      ).toThrow(UnauthorizedException);
    });
  });
});
