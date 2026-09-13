import { Test, TestingModule } from '@nestjs/testing';
import { AuctionsResolver } from './auctions.resolver';
import { AuctionsService } from './auctions.service';
import { AuctionsFilterInput } from './dto/auctions-filter.input';
import { Types } from 'mongoose';
import { AuctionStatus } from './enums/auction-status.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateAuctionInput } from './dto/create-auction.input';
import { PUB_SUB_EVENTS } from '../infrastructure/pubsub/events.constants';

const mockAuctionsService = {
  findAuctions: jest.fn(),
  findAllForAdmin: jest.fn(),
  findAuction: jest.fn(),
  findMyAuctions: jest.fn(),
  findWonAuctions: jest.fn(),
  createAuction: jest.fn(),
  updateAuction: jest.fn(),
  cancelAuction: jest.fn(),
};

const mockPubSub = { asyncIterableIterator: jest.fn(), publish: jest.fn() };

describe('AuctionsResolver', () => {
  let resolver: AuctionsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsResolver,
        { provide: AuctionsService, useValue: mockAuctionsService },
        { provide: 'PUB_SUB', useValue: mockPubSub },
      ],
    }).compile();

    resolver = module.get<AuctionsResolver>(AuctionsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const userId = new Types.ObjectId().toString();
  const auctionId = new Types.ObjectId().toString();

  const mockCurrentUser: JwtPayload = {
    sub: userId,
    email: 'test@test.com',
    role: UserRole.USER,
  };

  const mockAuction = {
    _id: auctionId,
    title: 'Test',
    status: AuctionStatus.PENDING,
  };

  describe('queries', () => {
    it('getAuctions should return auctions page', async () => {
      const mockResult = {
        items: [mockAuction],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockAuctionsService.findAuctions.mockResolvedValue(mockResult);

      const filter = new AuctionsFilterInput();
      const result = await resolver.getAuctions({ page: 1, limit: 10 }, filter);
      expect(result).toEqual(mockResult);
      expect(mockAuctionsService.findAuctions).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        filter,
      );
    });

    it('adminAuctions should return admin auctions page', async () => {
      const mockResult = {
        items: [mockAuction],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockAuctionsService.findAllForAdmin.mockResolvedValue(mockResult);

      const filter = new AuctionsFilterInput();
      const result = await resolver.adminAuctions(
        { page: 1, limit: 10 },
        filter,
      );
      expect(result).toEqual(mockResult);
      expect(mockAuctionsService.findAllForAdmin).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        filter,
      );
    });

    it('getAuction should return single auction', async () => {
      mockAuctionsService.findAuction.mockResolvedValue(mockAuction);

      const result = await resolver.getAuction(auctionId);
      expect(result).toEqual(mockAuction);
      expect(mockAuctionsService.findAuction).toHaveBeenCalledWith(auctionId);
    });

    it('getMyAuctions should return current user auctions', async () => {
      const mockResult = {
        items: [mockAuction],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockAuctionsService.findMyAuctions.mockResolvedValue(mockResult);

      const filter = new AuctionsFilterInput();
      const result = await resolver.getMyAuctions(
        mockCurrentUser,
        { page: 1, limit: 10 },
        filter,
      );
      expect(result).toEqual(mockResult);
      expect(mockAuctionsService.findMyAuctions).toHaveBeenCalledWith(
        userId,
        { page: 1, limit: 10 },
        filter,
      );
    });

    it('getMyWonAuctions should return user won auctions', async () => {
      const mockResult = {
        items: [mockAuction],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockAuctionsService.findWonAuctions.mockResolvedValue(mockResult);

      const filter = new AuctionsFilterInput();
      const result = await resolver.getMyWonAuctions(
        mockCurrentUser,
        { page: 1, limit: 10 },
        filter,
      );
      expect(result).toEqual(mockResult);
      expect(mockAuctionsService.findWonAuctions).toHaveBeenCalledWith(
        userId,
        { page: 1, limit: 10 },
        filter,
      );
    });

    it('getUserAuctions should return auctions for given userId', async () => {
      const mockResult = {
        items: [mockAuction],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockAuctionsService.findMyAuctions.mockResolvedValue(mockResult);

      const filter = new AuctionsFilterInput();
      const result = await resolver.getUserAuctions(
        userId,
        { page: 1, limit: 10 },
        filter,
      );
      expect(result).toEqual(mockResult);
      expect(mockAuctionsService.findMyAuctions).toHaveBeenCalledWith(
        userId,
        { page: 1, limit: 10 },
        filter,
      );
    });
  });

  describe('mutations', () => {
    it('createAuction should return created auction', async () => {
      const input = new CreateAuctionInput();
      input.title = 'New Auction';
      mockAuctionsService.createAuction.mockResolvedValue(mockAuction);

      const result = await resolver.createAuction(mockCurrentUser, input);
      expect(result).toEqual(mockAuction);
      expect(mockAuctionsService.createAuction).toHaveBeenCalledWith(
        userId,
        input,
      );
    });

    it('updateAuction should return updated auction', async () => {
      const input = { title: 'Updated' };
      mockAuctionsService.updateAuction.mockResolvedValue(mockAuction);

      const result = await resolver.updateAuction(
        mockCurrentUser,
        auctionId,
        input,
      );
      expect(result).toEqual(mockAuction);
      expect(mockAuctionsService.updateAuction).toHaveBeenCalledWith(
        auctionId,
        userId,
        input,
      );
    });

    it('cancelAuction should return boolean', async () => {
      mockAuctionsService.cancelAuction.mockResolvedValue(true);

      const result = await resolver.cancelAuction(mockCurrentUser, auctionId);
      expect(result).toBe(true);
      expect(mockAuctionsService.cancelAuction).toHaveBeenCalledWith(
        auctionId,
        userId,
        mockCurrentUser.role,
      );
    });
  });

  describe('subscriptions', () => {
    it('auctionCreated should return async iterable from pubSub', () => {
      const mockIterator = Symbol('asyncIterator');
      mockPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = resolver.auctionCreated();

      expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        PUB_SUB_EVENTS.AUCTION_CREATED,
      );
      expect(result).toBe(mockIterator);
    });

    it('auctionStatusChanged should return async iterable from pubSub', () => {
      const mockIterator = Symbol('asyncIterator');
      mockPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = resolver.auctionStatusChanged(auctionId);

      expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith(
        PUB_SUB_EVENTS.AUCTION_STATUS_CHANGED,
      );
      expect(result).toBe(mockIterator);
    });
  });
});
