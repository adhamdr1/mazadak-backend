import { Test, TestingModule } from '@nestjs/testing';
import { BidsResolver } from './bids.resolver';
import { BidsService } from './bids.service';
import { AutoBiddingService } from './services/auto-bidding.service';
import { PlaceBidInput } from './dto/place-bid.input';
import { SetAutoBidInput } from './dto/set-auto-bid.input';
import { CancelAutoBidInput } from './dto/cancel-auto-bid.input';
import { BidsFilterInput } from './dto/bids-filter.input';
import { AutoBidStatus } from './enums/auto-bid-status.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

const mockBidsService = {
  placeBid: jest.fn(),
  getAuctionBids: jest.fn(),
  getMyBids: jest.fn(),
  adminGetAllBids: jest.fn(),
};

const mockAutoBiddingService = {
  setAutoBid: jest.fn(),
  cancelAutoBid: jest.fn(),
  getMyAutoBid: jest.fn(),
  getUserAutoBids: jest.fn(),
};

const mockPubSub = {
  asyncIterableIterator: jest.fn(),
  publish: jest.fn(),
};

describe('BidsResolver', () => {
  let resolver: BidsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsResolver,
        { provide: BidsService, useValue: mockBidsService },
        { provide: AutoBiddingService, useValue: mockAutoBiddingService },
        { provide: 'PUB_SUB', useValue: mockPubSub },
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

  describe('setAutoBid', () => {
    it('should set auto-bid for current user', async () => {
      const input: SetAutoBidInput = { auctionId: 'auctionId', maxAmount: 500 };
      const user: JwtPayload = {
        sub: 'userId',
        email: 'test@test.com',
        role: UserRole.USER,
      };
      const mockAutoBid = { _id: 'autoBidId', maxAmount: 500 };

      mockAutoBiddingService.setAutoBid.mockResolvedValue(mockAutoBid);

      const result = await resolver.setAutoBid(user, input);
      expect(result).toEqual(mockAutoBid);
      expect(mockAutoBiddingService.setAutoBid).toHaveBeenCalledWith(
        'userId',
        input,
      );
    });
  });

  describe('cancelAutoBid', () => {
    it('should cancel auto-bid for current user', async () => {
      const input: CancelAutoBidInput = { auctionId: 'auctionId' };
      const user: JwtPayload = {
        sub: 'userId',
        email: 'test@test.com',
        role: UserRole.USER,
      };

      mockAutoBiddingService.cancelAutoBid.mockResolvedValue(true);

      const result = await resolver.cancelAutoBid(user, input);
      expect(result).toBe(true);
      expect(mockAutoBiddingService.cancelAutoBid).toHaveBeenCalledWith(
        'userId',
        input,
      );
    });
  });

  describe('myAutoBid', () => {
    it('should return auto-bid for current user and auction', async () => {
      const user: JwtPayload = {
        sub: 'userId',
        email: 'test@test.com',
        role: UserRole.USER,
      };
      const mockAutoBid = { _id: 'autoBidId', maxAmount: 500 };

      mockAutoBiddingService.getMyAutoBid.mockResolvedValue(mockAutoBid);

      const result = await resolver.getMyAutoBid(user, 'auctionId');
      expect(result).toEqual(mockAutoBid);
      expect(mockAutoBiddingService.getMyAutoBid).toHaveBeenCalledWith(
        'userId',
        'auctionId',
      );
    });
  });

  describe('myAutoBids', () => {
    it('should return paginated auto-bids for current user', async () => {
      const pagination = { page: 1, limit: 10 };
      const user: JwtPayload = {
        sub: 'userId',
        email: 'test@test.com',
        role: UserRole.USER,
      };
      const mockPage = {
        items: [],
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      };

      mockAutoBiddingService.getUserAutoBids.mockResolvedValue(mockPage);

      const result = await resolver.getMyAutoBids(
        user,
        pagination,
        AutoBidStatus.ACTIVE,
      );
      expect(result).toEqual(mockPage);
      expect(mockAutoBiddingService.getUserAutoBids).toHaveBeenCalledWith(
        'userId',
        pagination.page,
        pagination.limit,
        AutoBidStatus.ACTIVE,
      );
    });
  });
});
