import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from './disputes.service';
import { EscrowService } from './escrow.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  DisputeStatus,
  EscrowStatus,
  DisputeResolution,
  DisputeReason,
} from '../enums';
import { Dispute, Escrow } from '../entities';
import { RabbitMQEvent } from '../../infrastructure/rabbitmq/rabbitmq-event.types';
import {
  DisputeNotFoundException,
  DisputeAlreadyResolvedException,
  DisputeWindowExpiredException,
  InvalidDisputeActionException,
  EscrowNotFoundException,
  EscrowAlreadyReleasedException,
  EscrowAlreadyDisputedException,
  EscrowUnauthorizedException,
} from '../exceptions';
import { DisputesPage, CreateDisputeInput } from '../dto';

const mockDisputeRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEscrowId: jest.fn(),
  findByAuctionId: jest.fn(),
  updateStatus: jest.fn(),
  findPaginated: jest.fn(),
};

const mockEscrowRepository = {
  findByAuctionId: jest.fn(),
  updateStatus: jest.fn(),
};

const mockEscrowService = {
  refundEscrow: jest.fn(),
  releaseEscrow: jest.fn(),
};

const mockOutboxService = {
  saveEvent: jest.fn(),
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

describe('DisputesService', () => {
  let service: DisputesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: 'IDisputeRepository', useValue: mockDisputeRepository },
        { provide: 'IEscrowRepository', useValue: mockEscrowRepository },
        { provide: EscrowService, useValue: mockEscrowService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const auctionId = new Types.ObjectId().toString();
  const buyerId = new Types.ObjectId().toString();
  const sellerId = new Types.ObjectId().toString();
  const escrowId = new Types.ObjectId().toString();
  const disputeId = new Types.ObjectId().toString();
  const userId = buyerId;
  const adminId = new Types.ObjectId().toString();

  const mockEscrow: Escrow = {
    _id: new Types.ObjectId(escrowId),
    auctionId: new Types.ObjectId(auctionId),
    buyerId: new Types.ObjectId(buyerId),
    sellerId: new Types.ObjectId(sellerId),
    amount: Types.Decimal128.fromString('1000'),
    currency: 'EGP',
    status: EscrowStatus.HELD,
    inspectionPeriodEndsAt: new Date(Date.now() + 10000),
  } as unknown as Escrow;

  const mockDispute: Dispute = {
    _id: new Types.ObjectId(disputeId),
    escrowId: new Types.ObjectId(escrowId),
    auctionId: new Types.ObjectId(auctionId),
    openedById: new Types.ObjectId(buyerId),
    againstUserId: new Types.ObjectId(sellerId),
    reason: DisputeReason.ITEM_DAMAGED,
    description: 'The item is damaged',
    status: DisputeStatus.OPEN,
  } as unknown as Dispute;

  describe('openDispute', () => {
    const input: CreateDisputeInput = {
      auctionId,
      reason: DisputeReason.ITEM_DAMAGED,
      description: 'The item is damaged',
      evidenceUrls: [],
    };

    it('should open a dispute successfully', async () => {
      mockEscrowRepository.findByAuctionId.mockResolvedValue(mockEscrow);
      mockDisputeRepository.create.mockResolvedValue(mockDispute);

      const result = await service.openDispute(buyerId, input);

      expect(result).toEqual(mockDispute);
      expect(mockDisputeRepository.create).toHaveBeenCalled();
      expect(mockEscrowRepository.updateStatus).toHaveBeenCalledWith(
        escrowId,
        EscrowStatus.DISPUTED,
        expect.objectContaining({ disputeId: new Types.ObjectId(disputeId) }),
        mockSession,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledTimes(2);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should throw EscrowNotFoundException if escrow not found', async () => {
      mockEscrowRepository.findByAuctionId.mockResolvedValue(null);
      await expect(service.openDispute(buyerId, input)).rejects.toThrow(
        EscrowNotFoundException,
      );
    });

    it('should throw EscrowUnauthorizedException if user is neither buyer nor seller', async () => {
      mockEscrowRepository.findByAuctionId.mockResolvedValue(mockEscrow);
      await expect(
        service.openDispute(new Types.ObjectId().toString(), input),
      ).rejects.toThrow(EscrowUnauthorizedException);
    });

    it('should throw EscrowAlreadyReleasedException if escrow is RELEASED', async () => {
      const releasedEscrow = { ...mockEscrow, status: EscrowStatus.RELEASED };
      mockEscrowRepository.findByAuctionId.mockResolvedValue(releasedEscrow);
      await expect(service.openDispute(buyerId, input)).rejects.toThrow(
        EscrowAlreadyReleasedException,
      );
    });

    it('should throw EscrowAlreadyDisputedException if escrow is DISPUTED', async () => {
      const disputedEscrow = { ...mockEscrow, status: EscrowStatus.DISPUTED };
      mockEscrowRepository.findByAuctionId.mockResolvedValue(disputedEscrow);
      await expect(service.openDispute(buyerId, input)).rejects.toThrow(
        EscrowAlreadyDisputedException,
      );
    });

    it('should throw InvalidDisputeActionException if escrow is not HELD', async () => {
      const refundedEscrow = { ...mockEscrow, status: EscrowStatus.REFUNDED };
      mockEscrowRepository.findByAuctionId.mockResolvedValue(refundedEscrow);
      await expect(service.openDispute(buyerId, input)).rejects.toThrow(
        InvalidDisputeActionException,
      );
    });

    it('should throw DisputeWindowExpiredException if inspection window is expired', async () => {
      const expiredEscrow = {
        ...mockEscrow,
        inspectionPeriodEndsAt: new Date(Date.now() - 10000),
      };
      mockEscrowRepository.findByAuctionId.mockResolvedValue(expiredEscrow);
      await expect(service.openDispute(buyerId, input)).rejects.toThrow(
        DisputeWindowExpiredException,
      );
    });
  });

  describe('cancelDispute', () => {
    it('should cancel the dispute successfully', async () => {
      mockDisputeRepository.findById.mockResolvedValue(mockDispute);
      const cancelledDispute = {
        ...mockDispute,
        status: DisputeStatus.CANCELLED,
      };
      mockDisputeRepository.updateStatus.mockResolvedValue(cancelledDispute);

      const result = await service.cancelDispute(buyerId, disputeId);

      expect(result).toEqual(cancelledDispute);
      expect(mockDisputeRepository.updateStatus).toHaveBeenCalledWith(
        disputeId,
        DisputeStatus.CANCELLED,
        undefined,
        mockSession,
      );
      expect(mockEscrowRepository.updateStatus).toHaveBeenCalledWith(
        escrowId,
        EscrowStatus.HELD,
        undefined,
        mockSession,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledWith(
        RabbitMQEvent.DisputeCancelled,
        expect.anything(),
        mockSession,
      );
    });

    it('should throw DisputeNotFoundException if not found', async () => {
      mockDisputeRepository.findById.mockResolvedValue(null);
      await expect(service.cancelDispute(buyerId, disputeId)).rejects.toThrow(
        DisputeNotFoundException,
      );
    });

    it('should throw EscrowUnauthorizedException if user did not open dispute', async () => {
      mockDisputeRepository.findById.mockResolvedValue(mockDispute);
      await expect(service.cancelDispute(sellerId, disputeId)).rejects.toThrow(
        EscrowUnauthorizedException,
      );
    });

    it('should throw DisputeAlreadyResolvedException if dispute is already resolved or cancelled', async () => {
      const resolvedDispute = {
        ...mockDispute,
        status: DisputeStatus.RESOLVED_BUYER_REFUNDED,
      };
      mockDisputeRepository.findById.mockResolvedValue(resolvedDispute);
      await expect(service.cancelDispute(buyerId, disputeId)).rejects.toThrow(
        DisputeAlreadyResolvedException,
      );
    });
  });

  describe('updateDisputeStatus', () => {
    it('should update the status by admin', async () => {
      mockDisputeRepository.findById.mockResolvedValue(mockDispute);
      const updatedDispute = {
        ...mockDispute,
        status: DisputeStatus.UNDER_REVIEW,
      };
      mockDisputeRepository.updateStatus.mockResolvedValue(updatedDispute);

      const result = await service.updateDisputeStatus({
        disputeId,
        status: DisputeStatus.UNDER_REVIEW,
      });

      expect(result).toEqual(updatedDispute);
      expect(mockDisputeRepository.updateStatus).toHaveBeenCalledWith(
        disputeId,
        DisputeStatus.UNDER_REVIEW,
      );
    });

    it('should throw DisputeNotFoundException if not found', async () => {
      mockDisputeRepository.findById.mockResolvedValue(null);
      await expect(
        service.updateDisputeStatus({
          disputeId,
          status: DisputeStatus.UNDER_REVIEW,
        }),
      ).rejects.toThrow(DisputeNotFoundException);
    });

    it('should throw DisputeAlreadyResolvedException if dispute is already resolved or cancelled', async () => {
      const resolvedDispute = {
        ...mockDispute,
        status: DisputeStatus.RESOLVED_SELLER_PAID,
      };
      mockDisputeRepository.findById.mockResolvedValue(resolvedDispute);
      await expect(
        service.updateDisputeStatus({
          disputeId,
          status: DisputeStatus.UNDER_REVIEW,
        }),
      ).rejects.toThrow(DisputeAlreadyResolvedException);
    });
  });

  describe('resolveDispute', () => {
    const input = {
      disputeId,
      decision: DisputeResolution.REFUND_BUYER,
      adminNotes: 'Buyer is correct',
    };

    it('should resolve dispute by refunding buyer', async () => {
      mockDisputeRepository.findById.mockResolvedValue(mockDispute);
      const resolvedDispute = {
        ...mockDispute,
        status: DisputeStatus.RESOLVED_BUYER_REFUNDED,
      };
      mockDisputeRepository.updateStatus.mockResolvedValue(resolvedDispute);

      const result = await service.resolveDispute(adminId, input);

      expect(result).toEqual(resolvedDispute);
      expect(mockEscrowService.refundEscrow).toHaveBeenCalled();
      expect(mockDisputeRepository.updateStatus).toHaveBeenCalledWith(
        disputeId,
        DisputeStatus.RESOLVED_BUYER_REFUNDED,
        expect.anything(),
        mockSession,
      );
    });

    it('should resolve dispute by paying seller', async () => {
      mockDisputeRepository.findById.mockResolvedValue(mockDispute);
      const resolvedDispute = {
        ...mockDispute,
        status: DisputeStatus.RESOLVED_SELLER_PAID,
      };
      mockDisputeRepository.updateStatus.mockResolvedValue(resolvedDispute);

      const sellerInput = { ...input, decision: DisputeResolution.PAY_SELLER };
      const result = await service.resolveDispute(adminId, sellerInput);

      expect(result).toEqual(resolvedDispute);
      expect(mockEscrowService.releaseEscrow).toHaveBeenCalled();
    });

    it('should throw DisputeNotFoundException if not found', async () => {
      mockDisputeRepository.findById.mockResolvedValue(null);
      await expect(service.resolveDispute(adminId, input)).rejects.toThrow(
        DisputeNotFoundException,
      );
    });
  });

  describe('getDisputeById', () => {
    it('should return dispute', async () => {
      mockDisputeRepository.findById.mockResolvedValue(mockDispute);
      const result = await service.getDisputeById(disputeId);
      expect(result).toEqual(mockDispute);
    });

    it('should throw DisputeNotFoundException if not found', async () => {
      mockDisputeRepository.findById.mockResolvedValue(null);
      await expect(service.getDisputeById(disputeId)).rejects.toThrow(
        DisputeNotFoundException,
      );
    });
  });

  describe('getDisputeByEscrowId', () => {
    it('should return dispute by escrow id', async () => {
      mockDisputeRepository.findByEscrowId.mockResolvedValue(mockDispute);
      const result = await service.getDisputeByEscrowId(escrowId);
      expect(result).toEqual(mockDispute);
    });
  });

  describe('getDisputeByAuctionId', () => {
    it('should return dispute by auction id', async () => {
      mockDisputeRepository.findByAuctionId.mockResolvedValue(mockDispute);
      const result = await service.getDisputeByAuctionId(auctionId);
      expect(result).toEqual(mockDispute);
    });
  });

  describe('getMyDisputes', () => {
    it('should return paginated disputes', async () => {
      const pageData = { items: [mockDispute], total: 1 };
      mockDisputeRepository.findPaginated.mockResolvedValue(pageData);

      const result = await service.getMyDisputes(userId, {
        page: 1,
        limit: 10,
      });
      const expectedPage: DisputesPage = {
        items: [mockDispute],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      expect(result).toEqual(expectedPage);
    });
  });

  describe('getAllDisputes', () => {
    it('should return paginated disputes for admin', async () => {
      const pageData = { items: [mockDispute], total: 1 };
      mockDisputeRepository.findPaginated.mockResolvedValue(pageData);

      const result = await service.getAllDisputes({ page: 1, limit: 10 });
      const expectedPage: DisputesPage = {
        items: [mockDispute],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      expect(result).toEqual(expectedPage);
    });
  });
});
