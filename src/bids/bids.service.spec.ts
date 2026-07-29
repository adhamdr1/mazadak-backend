import { Test, TestingModule } from '@nestjs/testing';
import { BidsService } from './bids.service';
import { WalletService } from '../wallet/wallet.service';
import { Types } from 'mongoose';
import { BidStatus } from './enums/bid-status.enum';
import { AuctionStatus } from '../auctions/enums/auction-status.enum';
import { PlaceBidInput } from './dto/place-bid.input';
import { BidsFilterInput } from './dto/bids-filter.input';
import { AuctionNotFoundException } from '../auctions/exceptions/auction-not-found.exception';
import { AuctionNotActiveException } from './exceptions/auction-not-active.exception';
import { BidOnOwnAuctionException } from './exceptions/bid-on-own-auction.exception';
import { AlreadyHighestBidderException } from './exceptions/already-highest-bidder.exception';
import { BidAmountTooLowException } from './exceptions/bid-amount-too-low.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { RedisService } from '../infrastructure/redis/redis.service';

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockBidRepository = {
  startSession: jest.fn().mockResolvedValue(mockSession),
  findWinningByAuctionId: jest.fn(),
  updateStatus: jest.fn(),
  create: jest.fn(),
  findByAuctionId: jest.fn(),
  findByBidderId: jest.fn(),
  findAll: jest.fn(),
  countByAuctionId: jest.fn().mockResolvedValue(0),
};

const mockAuctionRepository = {
  findById: jest.fn(),
  updateCurrentPrice: jest.fn(),
  findEndedWithoutWinner: jest.fn(),
  finalizeAuction: jest.fn(),
};

const mockWalletService = {
  hold: jest.fn().mockResolvedValue({
    wallet: {},
    transaction: { _id: new Types.ObjectId() },
  }),
  release: jest.fn().mockResolvedValue({
    wallet: {},
    transaction: { _id: new Types.ObjectId() },
  }),
  capture: jest.fn().mockResolvedValue({
    wallet: {},
    transaction: { _id: new Types.ObjectId() },
  }),
  deposit: jest.fn().mockResolvedValue({
    wallet: {},
    transaction: { _id: new Types.ObjectId() },
  }),
};

const mockNotificationsService = {
  sendOutbidEmail: jest.fn().mockResolvedValue(undefined),
  sendAuctionWonEmail: jest.fn().mockResolvedValue(undefined),
  sendAuctionEndedSellerEmail: jest.fn().mockResolvedValue(undefined),
  createInAppNotification: jest.fn().mockResolvedValue(undefined),
};

const mockUsersService = {
  findById: jest.fn(),
};

const mockRedisService = {
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
};

describe('BidsService', () => {
  let service: BidsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsService,
        { provide: 'IBidRepository', useValue: mockBidRepository },
        { provide: 'IAuctionRepository', useValue: mockAuctionRepository },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: RealtimeService,
          useValue: {
            publishBidAdded: jest.fn().mockResolvedValue(undefined),
            publishNotificationAdded: jest.fn().mockResolvedValue(undefined),
            publishAuctionStatusChanged: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<BidsService>(BidsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('placeBid', () => {
    const userId = new Types.ObjectId().toString();
    const auctionId = new Types.ObjectId().toString();
    const input: PlaceBidInput = { auctionId, amount: 200 };

    const mockAuction = {
      _id: auctionId,
      sellerId: new Types.ObjectId(),
      status: AuctionStatus.ACTIVE,
      startingPrice: 100,
      currentPrice: 150,
      minimumBidIncrement: 10,
    };

    it('should place a bid successfully and outbid previous winner', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      const prevWinner = {
        _id: new Types.ObjectId(),
        bidderId: new Types.ObjectId(),
        amount: 150,
      };
      mockBidRepository.findWinningByAuctionId.mockResolvedValue(prevWinner);

      const newBid = {
        _id: new Types.ObjectId(),
        bidderId: new Types.ObjectId(userId),
        amount: 200,
        status: BidStatus.WINNING,
      };
      mockBidRepository.create.mockResolvedValue(newBid);

      const result = await service.placeBid(userId, input);

      expect(result).toEqual(newBid);
      expect(mockWalletService.hold).toHaveBeenCalledWith(
        userId,
        200,
        auctionId,
        mockSession,
      );
      expect(mockWalletService.release).toHaveBeenCalledWith(
        prevWinner.bidderId.toString(),
        150,
        auctionId,
        mockSession,
      );
      expect(mockBidRepository.updateStatus).toHaveBeenCalledWith(
        prevWinner._id.toString(),
        BidStatus.OUTBID,
        mockSession,
      );
      expect(mockBidRepository.create).toHaveBeenCalled();
      expect(mockAuctionRepository.updateCurrentPrice).toHaveBeenCalledWith(
        auctionId,
        200,
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should throw AuctionNotFoundException if auction does not exist', async () => {
      mockAuctionRepository.findById.mockResolvedValue(null);
      await expect(service.placeBid(userId, input)).rejects.toThrow(
        AuctionNotFoundException,
      );
    });

    it('should throw AuctionNotActiveException if auction is not active', async () => {
      mockAuctionRepository.findById.mockResolvedValue({
        ...mockAuction,
        status: AuctionStatus.PENDING,
      });
      await expect(service.placeBid(userId, input)).rejects.toThrow(
        AuctionNotActiveException,
      );
    });

    it('should throw BidOnOwnAuctionException if user is seller', async () => {
      mockAuctionRepository.findById.mockResolvedValue({
        ...mockAuction,
        sellerId: new Types.ObjectId(userId),
      });
      await expect(service.placeBid(userId, input)).rejects.toThrow(
        BidOnOwnAuctionException,
      );
    });

    it('should throw AlreadyHighestBidderException if user is already winning', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockBidRepository.findWinningByAuctionId.mockResolvedValue({
        bidderId: new Types.ObjectId(userId),
      });
      await expect(service.placeBid(userId, input)).rejects.toThrow(
        AlreadyHighestBidderException,
      );
    });

    it('should throw BidAmountTooLowException if amount is lower than required', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockBidRepository.findWinningByAuctionId.mockResolvedValue({
        bidderId: new Types.ObjectId(),
        amount: 150,
      });
      // minimum required = 150 + 10 = 160
      const lowInput = { auctionId, amount: 155 };
      await expect(service.placeBid(userId, lowInput)).rejects.toThrow(
        BidAmountTooLowException,
      );
    });
  });

  describe('finalizeEndedAuctions', () => {
    it('should finalize ended auctions successfully', async () => {
      const auctionId = new Types.ObjectId().toString();
      const sellerId = new Types.ObjectId().toString();
      const mockEndedAuctions = [
        { _id: auctionId, sellerId: new Types.ObjectId(sellerId) },
      ];
      const mockWinningBid = { bidderId: new Types.ObjectId(), amount: 200 };

      mockAuctionRepository.findEndedWithoutWinner.mockResolvedValue(
        mockEndedAuctions,
      );
      mockBidRepository.findWinningByAuctionId.mockResolvedValue(
        mockWinningBid,
      );

      await service.finalizeEndedAuctions();

      const winnerId = mockWinningBid.bidderId.toString();
      expect(mockWalletService.capture).toHaveBeenCalledWith(
        winnerId,
        200,
        auctionId,
        mockSession,
      );
      expect(mockWalletService.deposit).toHaveBeenCalledWith(
        sellerId,
        200,
        auctionId,
        mockSession,
      );
      expect(mockAuctionRepository.finalizeAuction).toHaveBeenCalledWith(
        auctionId,
        winnerId,
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should do nothing if no ended auctions', async () => {
      mockAuctionRepository.findEndedWithoutWinner.mockResolvedValue([]);
      await service.finalizeEndedAuctions();
      expect(mockBidRepository.findWinningByAuctionId).not.toHaveBeenCalled();
    });
  });

  describe('Queries', () => {
    const filter = new BidsFilterInput();
    const pagination = { page: 1, limit: 10 };
    const mockPage = { items: [], total: 0 };

    it('should get auction bids', async () => {
      mockBidRepository.findByAuctionId.mockResolvedValue(mockPage);
      const result = await service.getAuctionBids(
        'auctionId',
        pagination,
        filter,
      );
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockBidRepository.findByAuctionId).toHaveBeenCalledWith(
        'auctionId',
        pagination.page,
        pagination.limit,
        filter,
      );
    });

    it('should get user bids', async () => {
      mockBidRepository.findByBidderId.mockResolvedValue(mockPage);
      const result = await service.getMyBids('userId', pagination, filter);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockBidRepository.findByBidderId).toHaveBeenCalledWith(
        'userId',
        pagination.page,
        pagination.limit,
        filter,
      );
    });

    it('should get all bids for admin', async () => {
      mockBidRepository.findAll.mockResolvedValue(mockPage);
      const result = await service.adminGetAllBids(pagination, filter);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockBidRepository.findAll).toHaveBeenCalledWith(
        pagination.page,
        pagination.limit,
        filter,
      );
    });
  });
});
