import { Test, TestingModule } from '@nestjs/testing';
import { BidsResolver } from './bids.resolver';
import { BidsService } from './bids.service';
import { PlaceBidInput } from './dto/place-bid.input';
import { BidsFilterInput } from './dto/bids-filter.input';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

const mockBidsService = {
  placeBid: jest.fn(),
  getAuctionBids: jest.fn(),
  getMyBids: jest.fn(),
  adminGetAllBids: jest.fn(),
};

describe('BidsResolver', () => {
  let resolver: BidsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsResolver,
        { provide: BidsService, useValue: mockBidsService },
      ],
    }).compile();

    resolver = module.get<BidsResolver>(BidsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getAuctionBids', () => {
    const filter = new BidsFilterInput();
    const pagination = { page: 1, limit: 10 };
    const mockResult = {
      items: [],
      total: 0,
      totalPages: 0,
      hasNextPage: false,
    };

    it('should return paginated bids for an auction', async () => {
      mockBidsService.getAuctionBids.mockResolvedValue(mockResult);

      const result = await resolver.getAuctionBids(
        'auctionId',
        pagination,
        filter,
      );
      expect(result).toEqual(mockResult);
      expect(mockBidsService.getAuctionBids).toHaveBeenCalledWith(
        'auctionId',
        pagination,
        filter,
      );
    });
  });

  describe('adminBids', () => {
    const filter = new BidsFilterInput();
    const pagination = { page: 1, limit: 10 };
    const mockResult = {
      items: [],
      total: 0,
      totalPages: 0,
      hasNextPage: false,
    };

    it('should return all paginated bids for admin', async () => {
      mockBidsService.adminGetAllBids.mockResolvedValue(mockResult);

      const result = await resolver.adminBids(pagination, filter);
      expect(result).toEqual(mockResult);
      expect(mockBidsService.adminGetAllBids).toHaveBeenCalledWith(
        pagination,
        filter,
      );
    });
  });

  describe('getMyBids', () => {
    it('should return paginated bids for current user', async () => {
      const filter = new BidsFilterInput();
      const pagination = { page: 1, limit: 10 };
      const mockResult = {
        items: [],
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      };
      const user: JwtPayload = {
        sub: 'userId',
        email: 'test@test.com',
        role: UserRole.USER,
      };

      mockBidsService.getMyBids.mockResolvedValue(mockResult);

      const result = await resolver.getMyBids(user, pagination, filter);
      expect(result).toEqual(mockResult);
      expect(mockBidsService.getMyBids).toHaveBeenCalledWith(
        'userId',
        pagination,
        filter,
      );
    });
  });

  describe('placeBid', () => {
    it('should place a bid for current user', async () => {
      const input: PlaceBidInput = { auctionId: 'auctionId', amount: 100 };
      const user: JwtPayload = {
        sub: 'userId',
        email: 'test@test.com',
        role: UserRole.USER,
      };
      const mockBid = { _id: 'bidId' };

      mockBidsService.placeBid.mockResolvedValue(mockBid);

      const result = await resolver.placeBid(user, input);
      expect(result).toEqual(mockBid);
      expect(mockBidsService.placeBid).toHaveBeenCalledWith('userId', input);
    });
  });
});
