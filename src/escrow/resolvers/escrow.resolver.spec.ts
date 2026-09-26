import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { EscrowResolver } from './escrow.resolver';
import { EscrowService } from '../services';
import { Types } from 'mongoose';
import { EscrowStatus } from '../enums';
import { Escrow } from '../entities';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';
import { EscrowUnauthorizedException } from '../exceptions';
import { EscrowsPage } from '../dto';
import { PUB_SUB } from '../../infrastructure/pubsub/pubsub.provider';
import { PUB_SUB_EVENTS } from '../../infrastructure/pubsub/events.constants';
import { GetAuctionByIdQuery } from '../../auctions/queries/get-auction-by-id.query';

const mockEscrowService = {
  getEscrowByAuctionId: jest.fn(),
  getEscrowById: jest.fn(),
  getMyEscrows: jest.fn(),
  getAllEscrows: jest.fn(),
  confirmDelivery: jest.fn(),
  releaseEscrow: jest.fn(),
  refundEscrow: jest.fn(),
};

const mockQueryBus = {
  execute: jest.fn(),
};

const mockPubSub = {
  asyncIterableIterator: jest.fn(),
};

describe('EscrowResolver', () => {
  let resolver: EscrowResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowResolver,
        { provide: EscrowService, useValue: mockEscrowService },
        { provide: QueryBus, useValue: mockQueryBus },
        { provide: PUB_SUB, useValue: mockPubSub },
      ],
    }).compile();

    resolver = module.get<EscrowResolver>(EscrowResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const auctionId = new Types.ObjectId().toString();
  const buyerId = new Types.ObjectId().toString();
  const sellerId = new Types.ObjectId().toString();
  const escrowId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();

  const mockEscrow: Escrow = {
    _id: new Types.ObjectId(escrowId),
    auctionId: new Types.ObjectId(auctionId),
    buyerId: new Types.ObjectId(buyerId),
    sellerId: new Types.ObjectId(sellerId),
    amount: Types.Decimal128.fromString('1000'),
    currency: 'EGP',
    status: EscrowStatus.HELD,
  } as unknown as Escrow;

  const buyerUser: JwtPayload = {
    sub: buyerId,
    email: 'b@b.com',
    role: UserRole.USER,
  };
  const sellerUser: JwtPayload = {
    sub: sellerId,
    email: 's@s.com',
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

  describe('getEscrowByAuction', () => {
    it('should return escrow if user is buyer', async () => {
      mockEscrowService.getEscrowByAuctionId.mockResolvedValue(mockEscrow);
      const result = await resolver.getEscrowByAuction(auctionId, buyerUser);
      expect(result).toEqual(mockEscrow);
    });

    it('should return escrow if user is seller', async () => {
      mockEscrowService.getEscrowByAuctionId.mockResolvedValue(mockEscrow);
      const result = await resolver.getEscrowByAuction(auctionId, sellerUser);
      expect(result).toEqual(mockEscrow);
    });

    it('should return escrow if user is admin', async () => {
      mockEscrowService.getEscrowByAuctionId.mockResolvedValue(mockEscrow);
      const result = await resolver.getEscrowByAuction(auctionId, adminUser);
      expect(result).toEqual(mockEscrow);
    });

    it('should throw EscrowUnauthorizedException if user is neither buyer, seller, nor admin', async () => {
      mockEscrowService.getEscrowByAuctionId.mockResolvedValue(mockEscrow);
      await expect(
        resolver.getEscrowByAuction(auctionId, otherUser),
      ).rejects.toThrow(EscrowUnauthorizedException);
    });

    it('should return null if escrow not found', async () => {
      mockEscrowService.getEscrowByAuctionId.mockResolvedValue(null);
      const result = await resolver.getEscrowByAuction(auctionId, buyerUser);
      expect(result).toBeNull();
    });
  });

  describe('getEscrow', () => {
    it('should return escrow if user is buyer', async () => {
      mockEscrowService.getEscrowById.mockResolvedValue(mockEscrow);
      const result = await resolver.getEscrow(escrowId, buyerUser);
      expect(result).toEqual(mockEscrow);
    });

    it('should throw EscrowUnauthorizedException if user is unauthorized', async () => {
      mockEscrowService.getEscrowById.mockResolvedValue(mockEscrow);
      await expect(resolver.getEscrow(escrowId, otherUser)).rejects.toThrow(
        EscrowUnauthorizedException,
      );
    });
  });

  describe('getMyEscrows', () => {
    it('should return paginated escrows for user', async () => {
      const pageData: EscrowsPage = {
        items: [mockEscrow],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockEscrowService.getMyEscrows.mockResolvedValue(pageData);

      const result = await resolver.getMyEscrows(buyerUser, {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(pageData);
      expect(mockEscrowService.getMyEscrows).toHaveBeenCalledWith(
        buyerId,
        { page: 1, limit: 10 },
        undefined,
      );
    });
  });

  describe('getAllEscrows', () => {
    it('should return all escrows for admin', async () => {
      const pageData: EscrowsPage = {
        items: [mockEscrow],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockEscrowService.getAllEscrows.mockResolvedValue(pageData);

      const result = await resolver.getAllEscrows({ page: 1, limit: 10 });
      expect(result).toEqual(pageData);
      expect(mockEscrowService.getAllEscrows).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        undefined,
      );
    });
  });

  describe('confirmDelivery', () => {
    it('should call confirmDelivery on service', async () => {
      mockEscrowService.confirmDelivery.mockResolvedValue(mockEscrow);
      const result = await resolver.confirmDelivery(buyerUser, escrowId);
      expect(result).toEqual(mockEscrow);
      expect(mockEscrowService.confirmDelivery).toHaveBeenCalledWith(
        buyerId,
        escrowId,
      );
    });
  });

  describe('releaseEscrow', () => {
    it('should call releaseEscrow on service', async () => {
      mockEscrowService.releaseEscrow.mockResolvedValue(mockEscrow);
      const result = await resolver.releaseEscrow(escrowId, 'manual');
      expect(result).toEqual(mockEscrow);
      expect(mockEscrowService.releaseEscrow).toHaveBeenCalledWith(
        escrowId,
        'manual',
      );
    });

    it('should use default reason if none provided', async () => {
      mockEscrowService.releaseEscrow.mockResolvedValue(mockEscrow);
      const result = await resolver.releaseEscrow(escrowId);
      expect(result).toEqual(mockEscrow);
      expect(mockEscrowService.releaseEscrow).toHaveBeenCalledWith(
        escrowId,
        'Admin manual release',
      );
    });
  });

  describe('refundEscrow', () => {
    it('should call refundEscrow on service', async () => {
      mockEscrowService.refundEscrow.mockResolvedValue(mockEscrow);
      const result = await resolver.refundEscrow(escrowId, 'manual refund');
      expect(result).toEqual(mockEscrow);
      expect(mockEscrowService.refundEscrow).toHaveBeenCalledWith(
        escrowId,
        'manual refund',
      );
    });

    it('should use default reason if none provided', async () => {
      mockEscrowService.refundEscrow.mockResolvedValue(mockEscrow);
      const result = await resolver.refundEscrow(escrowId);
      expect(result).toEqual(mockEscrow);
      expect(mockEscrowService.refundEscrow).toHaveBeenCalledWith(
        escrowId,
        'Admin manual refund',
      );
    });
  });

  describe('Field Resolvers', () => {
    it('should resolve auction using QueryBus', async () => {
      const mockAuction = {
        _id: new Types.ObjectId(auctionId),
        title: 'Test Auction',
      };
      mockQueryBus.execute.mockResolvedValue(mockAuction);

      const result = await resolver.auction(mockEscrow);
      expect(result).toEqual(mockAuction);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        new GetAuctionByIdQuery(auctionId),
      );
    });

    it('should return null if auctionId is missing', async () => {
      const result = await resolver.auction({} as unknown as Escrow);
      expect(result).toBeNull();
    });

    it('should return inspectionDurationHours as 168', () => {
      const result = resolver.inspectionDurationHours();
      expect(result).toBe(168);
    });
  });

  describe('escrowStatusChanged subscription', () => {
    it('should return async iterable iterator for ESCROW_STATUS_CHANGED', () => {
      const mockIterator = { [Symbol.asyncIterator]: jest.fn() };
      mockPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = resolver.escrowStatusChanged(escrowId);
      expect(result).toBe(mockIterator);
      expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        PUB_SUB_EVENTS.ESCROW_STATUS_CHANGED,
      );
    });
  });
});
