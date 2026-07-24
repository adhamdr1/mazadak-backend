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
    it('should return paginated bids for an auction', async () => {
      const filter = new BidsFilterInput();
      const mockResult = {
        items: [],
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      };
      mockBidsService.getAuctionBids.mockResolvedValue(mockResult);

      const result = await resolver.getAuctionBids('auctionId', filter);
      expect(result).toEqual(mockResult);
      expect(mockBidsService.getAuctionBids).toHaveBeenCalledWith(
        'auctionId',
        filter,
      );
    });
  });

  describe('getMyBids', () => {
    it('should return paginated bids for current user', async () => {
      const filter = new BidsFilterInput();
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

      const result = await resolver.getMyBids(user, filter);
      expect(result).toEqual(mockResult);
      expect(mockBidsService.getMyBids).toHaveBeenCalledWith('userId', filter);
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
