import { Test, TestingModule } from '@nestjs/testing';
import { DisputesResolver } from './disputes.resolver';
import { DisputesService } from '../services';
import { Types } from 'mongoose';
import { DisputeStatus, DisputeResolution, DisputeReason } from '../enums';
import { Dispute } from '../entities';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';
import { EscrowUnauthorizedException } from '../exceptions';
import {
  DisputesPage,
  CreateDisputeInput,
  ResolveDisputeInput,
  UpdateDisputeStatusInput,
} from '../dto';

const mockDisputesService = {
  getDisputeById: jest.fn(),
  getDisputeByAuctionId: jest.fn(),
  getMyDisputes: jest.fn(),
  getAllDisputes: jest.fn(),
  openDispute: jest.fn(),
  cancelDispute: jest.fn(),
  updateDisputeStatus: jest.fn(),
  resolveDispute: jest.fn(),
};

describe('DisputesResolver', () => {
  let resolver: DisputesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesResolver,
        { provide: DisputesService, useValue: mockDisputesService },
      ],
    }).compile();

    resolver = module.get<DisputesResolver>(DisputesResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const disputeId = new Types.ObjectId().toString();
  const auctionId = new Types.ObjectId().toString();
  const openedById = new Types.ObjectId().toString();
  const againstUserId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();

  const mockDispute: Dispute = {
    _id: new Types.ObjectId(disputeId),
    escrowId: new Types.ObjectId(),
    auctionId: new Types.ObjectId(auctionId),
    openedById: new Types.ObjectId(openedById),
    againstUserId: new Types.ObjectId(againstUserId),
    reason: DisputeReason.ITEM_DAMAGED,
    description: 'Item broken',
    status: DisputeStatus.OPEN,
  } as unknown as Dispute;

  const partyUser: JwtPayload = {
    sub: openedById,
    email: 'p@p.com',
    role: UserRole.USER,
  };
  const adminUser: JwtPayload = {
    sub: adminId,
    email: 'a@a.com',
    role: UserRole.ADMIN,
  };
  const otherUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    email: 'o@o.com',
    role: UserRole.USER,
  };

  describe('getDispute', () => {
    it('should return dispute if user is party', async () => {
      mockDisputesService.getDisputeById.mockResolvedValue(mockDispute);
      const result = await resolver.getDispute(disputeId, partyUser);
      expect(result).toEqual(mockDispute);
    });

    it('should return dispute if user is admin', async () => {
      mockDisputesService.getDisputeById.mockResolvedValue(mockDispute);
      const result = await resolver.getDispute(disputeId, adminUser);
      expect(result).toEqual(mockDispute);
    });

    it('should throw EscrowUnauthorizedException if user is unauthorized', async () => {
      mockDisputesService.getDisputeById.mockResolvedValue(mockDispute);
      await expect(resolver.getDispute(disputeId, otherUser)).rejects.toThrow(
        EscrowUnauthorizedException,
      );
    });
  });

  describe('getDisputeByAuction', () => {
    it('should return dispute if user is party', async () => {
      mockDisputesService.getDisputeByAuctionId.mockResolvedValue(mockDispute);
      const result = await resolver.getDisputeByAuction(auctionId, partyUser);
      expect(result).toEqual(mockDispute);
    });

    it('should throw EscrowUnauthorizedException if user is unauthorized', async () => {
      mockDisputesService.getDisputeByAuctionId.mockResolvedValue(mockDispute);
      await expect(
        resolver.getDisputeByAuction(auctionId, otherUser),
      ).rejects.toThrow(EscrowUnauthorizedException);
    });

    it('should return null if not found', async () => {
      mockDisputesService.getDisputeByAuctionId.mockResolvedValue(null);
      const result = await resolver.getDisputeByAuction(auctionId, partyUser);
      expect(result).toBeNull();
    });
  });

  describe('getMyDisputes', () => {
    it('should return paginated disputes', async () => {
      const pageData: DisputesPage = {
        items: [mockDispute],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockDisputesService.getMyDisputes.mockResolvedValue(pageData);

      const result = await resolver.getMyDisputes(partyUser, {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(pageData);
      expect(mockDisputesService.getMyDisputes).toHaveBeenCalledWith(
        openedById,
        { page: 1, limit: 10 },
        undefined,
      );
    });
  });

  describe('getAllDisputes', () => {
    it('should return all disputes', async () => {
      const pageData: DisputesPage = {
        items: [mockDispute],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockDisputesService.getAllDisputes.mockResolvedValue(pageData);

      const result = await resolver.getAllDisputes({ page: 1, limit: 10 });
      expect(result).toEqual(pageData);
      expect(mockDisputesService.getAllDisputes).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        undefined,
      );
    });
  });

  describe('openDispute', () => {
    it('should open a dispute', async () => {
      const input: CreateDisputeInput = {
        auctionId,
        reason: DisputeReason.ITEM_DAMAGED,
        description: 'Item broken',
        evidenceUrls: [],
      };
      mockDisputesService.openDispute.mockResolvedValue(mockDispute);

      const result = await resolver.openDispute(partyUser, input);
      expect(result).toEqual(mockDispute);
      expect(mockDisputesService.openDispute).toHaveBeenCalledWith(
        openedById,
        input,
      );
    });
  });

  describe('cancelDispute', () => {
    it('should cancel a dispute', async () => {
      mockDisputesService.cancelDispute.mockResolvedValue(mockDispute);
      const result = await resolver.cancelDispute(partyUser, disputeId);
      expect(result).toEqual(mockDispute);
      expect(mockDisputesService.cancelDispute).toHaveBeenCalledWith(
        openedById,
        disputeId,
      );
    });
  });

  describe('updateDisputeStatus', () => {
    it('should update status', async () => {
      const input: UpdateDisputeStatusInput = {
        disputeId,
        status: DisputeStatus.UNDER_REVIEW,
      };
      mockDisputesService.updateDisputeStatus.mockResolvedValue(mockDispute);

      const result = await resolver.updateDisputeStatus(input);
      expect(result).toEqual(mockDispute);
      expect(mockDisputesService.updateDisputeStatus).toHaveBeenCalledWith(
        input,
      );
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute', async () => {
      const input: ResolveDisputeInput = {
        disputeId,
        decision: DisputeResolution.REFUND_BUYER,
      };
      mockDisputesService.resolveDispute.mockResolvedValue(mockDispute);

      const result = await resolver.resolveDispute(adminUser, input);
      expect(result).toEqual(mockDispute);
      expect(mockDisputesService.resolveDispute).toHaveBeenCalledWith(
        adminId,
        input,
      );
    });
  });
});
