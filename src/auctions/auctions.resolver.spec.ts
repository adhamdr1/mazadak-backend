import { Test, TestingModule } from '@nestjs/testing';
import { AuctionsResolver } from './auctions.resolver';
import { AuctionsService } from './auctions.service';
import { AuctionsFilterInput } from './dto/auctions-filter.input';
import { Types } from 'mongoose';
import { AuctionStatus } from './enums/auction-status.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateAuctionInput } from './dto/create-auction.input';

const mockAuctionsService = {
  findAuctions: jest.fn(),
  findAuction: jest.fn(),
  findMyAuctions: jest.fn(),
  findWonAuctions: jest.fn(),
  createAuction: jest.fn(),
  updateAuction: jest.fn(),
  cancelAuction: jest.fn(),
};

describe('AuctionsResolver', () => {
  let resolver: AuctionsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsResolver,
        { provide: AuctionsService, useValue: mockAuctionsService },
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

  const mockPageResult = {
    items: [mockAuction],
    total: 1,
    totalPages: 1,
    hasNextPage: false,
  };

  describe('Queries', () => {
    it('getAuctions should return paginated auctions', async () => {
      mockAuctionsService.findAuctions.mockResolvedValue(mockPageResult);
      const filter = new AuctionsFilterInput();
      const result = await resolver.getAuctions(filter);

      expect(result).toEqual(mockPageResult);
      expect(mockAuctionsService.findAuctions).toHaveBeenCalledWith(filter);
    });

    it('getAuction should return single auction', async () => {
      mockAuctionsService.findAuction.mockResolvedValue(mockAuction);
      const result = await resolver.getAuction(auctionId);

      expect(result).toEqual(mockAuction);
      expect(mockAuctionsService.findAuction).toHaveBeenCalledWith(auctionId);
    });

    it('getMyAuctions should return user auctions', async () => {
      mockAuctionsService.findMyAuctions.mockResolvedValue(mockPageResult);
      const filter = new AuctionsFilterInput();
      const result = await resolver.getMyAuctions(mockCurrentUser, filter);

      expect(result).toEqual(mockPageResult);
      expect(mockAuctionsService.findMyAuctions).toHaveBeenCalledWith(
        userId,
        filter,
      );
    });

    it('getMyWonAuctions should return user won auctions', async () => {
      mockAuctionsService.findWonAuctions.mockResolvedValue(mockPageResult);
      const filter = new AuctionsFilterInput();
      const result = await resolver.getMyWonAuctions(mockCurrentUser, filter);

      expect(result).toEqual(mockPageResult);
      expect(mockAuctionsService.findWonAuctions).toHaveBeenCalledWith(
        userId,
        filter,
      );
    });
  });

  describe('Mutations', () => {
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
});
