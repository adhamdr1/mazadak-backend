import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminWithdrawalsResolver } from './admin-withdrawals.resolver';
import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { PUB_SUB } from '../../infrastructure/pubsub/pubsub.provider';
import { PUB_SUB_EVENTS } from '../../infrastructure/pubsub/events.constants';
import { UserRole } from '../../users/enums/user-role.enum';
import { WithdrawalStatus } from '../../withdrawals/enums/withdrawal-status.enum';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

describe('AdminWithdrawalsResolver', () => {
  let resolver: AdminWithdrawalsResolver;

  const mockWithdrawalsService = {
    adminGetWithdrawals: jest.fn(),
    adminGetWithdrawal: jest.fn(),
    adminStartProcessing: jest.fn(),
    adminCompleteWithdrawal: jest.fn(),
    adminRejectWithdrawal: jest.fn(),
  };

  const mockPubSub = {
    asyncIterableIterator: jest.fn(),
  };

  const adminUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    role: UserRole.ADMIN,
    email: 'admin@mazadak.com',
  };

  const normalUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    role: UserRole.USER,
    email: 'user@mazadak.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminWithdrawalsResolver,
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

    resolver = module.get<AdminWithdrawalsResolver>(AdminWithdrawalsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('adminGetWithdrawals', () => {
    it('should delegate to withdrawalsService.adminGetWithdrawals', async () => {
      const mockPage = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockWithdrawalsService.adminGetWithdrawals.mockResolvedValue(mockPage);

      const result = await resolver.adminGetWithdrawals(
        { page: 1, limit: 10 },
        { status: WithdrawalStatus.PENDING },
      );

      expect(result).toEqual(mockPage);
      expect(mockWithdrawalsService.adminGetWithdrawals).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        { status: WithdrawalStatus.PENDING },
      );
    });
  });

  describe('adminGetWithdrawal', () => {
    it('should delegate to withdrawalsService.adminGetWithdrawal', async () => {
      const id = new Types.ObjectId().toString();
      const mockWithdrawal = { _id: id };
      mockWithdrawalsService.adminGetWithdrawal.mockResolvedValue(
        mockWithdrawal,
      );

      const result = await resolver.adminGetWithdrawal(id);

      expect(result).toEqual(mockWithdrawal);
      expect(mockWithdrawalsService.adminGetWithdrawal).toHaveBeenCalledWith(
        id,
      );
    });
  });

  describe('adminStartWithdrawalProcessing', () => {
    it('should delegate to withdrawalsService.adminStartProcessing', async () => {
      const requestId = new Types.ObjectId().toString();
      const mockUpdated = {
        _id: requestId,
        status: WithdrawalStatus.PROCESSING,
      };
      mockWithdrawalsService.adminStartProcessing.mockResolvedValue(
        mockUpdated,
      );

      const result = await resolver.adminStartWithdrawalProcessing(
        adminUser,
        requestId,
      );

      expect(result).toEqual(mockUpdated);
      expect(mockWithdrawalsService.adminStartProcessing).toHaveBeenCalledWith(
        adminUser.sub,
        requestId,
      );
    });
  });

  describe('adminCompleteWithdrawal', () => {
    it('should delegate to withdrawalsService.adminCompleteWithdrawal', async () => {
      const input = {
        withdrawalId: new Types.ObjectId().toString(),
        adminReference: 'BANK-REF-999',
        receiptUrl: 'https://cdn.example.com/receipt.pdf',
      };
      const mockCompleted = {
        _id: input.withdrawalId,
        status: WithdrawalStatus.COMPLETED,
      };
      mockWithdrawalsService.adminCompleteWithdrawal.mockResolvedValue(
        mockCompleted,
      );

      const result = await resolver.adminCompleteWithdrawal(adminUser, input);

      expect(result).toEqual(mockCompleted);
      expect(
        mockWithdrawalsService.adminCompleteWithdrawal,
      ).toHaveBeenCalledWith(adminUser.sub, input);
    });
  });

  describe('adminRejectWithdrawal', () => {
    it('should delegate to withdrawalsService.adminRejectWithdrawal', async () => {
      const input = {
        withdrawalId: new Types.ObjectId().toString(),
        rejectionReason: 'Invalid account number',
      };
      const mockRejected = {
        _id: input.withdrawalId,
        status: WithdrawalStatus.REJECTED,
      };
      mockWithdrawalsService.adminRejectWithdrawal.mockResolvedValue(
        mockRejected,
      );

      const result = await resolver.adminRejectWithdrawal(adminUser, input);

      expect(result).toEqual(mockRejected);
      expect(mockWithdrawalsService.adminRejectWithdrawal).toHaveBeenCalledWith(
        adminUser.sub,
        input,
      );
    });
  });

  describe('adminWithdrawalFeed subscription', () => {
    it('should return asyncIterator when user is ADMIN', () => {
      const mockIterator = Symbol('asyncIterator');
      mockPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = resolver.adminWithdrawalFeed(adminUser);

      expect(result).toBe(mockIterator);
      expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith([
        PUB_SUB_EVENTS.WITHDRAWAL_REQUESTED,
        PUB_SUB_EVENTS.WITHDRAWAL_STATUS_CHANGED,
      ]);
    });

    it('should throw UnauthorizedException if user is not ADMIN or undefined', () => {
      expect(() => resolver.adminWithdrawalFeed(normalUser)).toThrow(
        UnauthorizedException,
      );
      expect(() => resolver.adminWithdrawalFeed(undefined)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
