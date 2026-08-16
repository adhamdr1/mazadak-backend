import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { AutoBiddingService } from './auto-bidding.service';
import { ProxyBiddingEngineService } from './proxy-bidding-engine.service';
import { WalletService } from '../../wallet/wallet.service';
import { RealtimeService } from '../../infrastructure/pubsub/realtime.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { AuctionStatus } from '../../auctions/enums/auction-status.enum';
import { AutoBidStatus } from '../enums/auto-bid-status.enum';
import { AuctionNotFoundException } from '../../auctions/exceptions/auction-not-found.exception';
import { AutoBidOnOwnAuctionException } from '../exceptions/auto-bid-on-own-auction.exception';
import { AutoBidMaxTooLowException } from '../exceptions/auto-bid-max-too-low.exception';
import { AutoBidInsufficientBalanceException } from '../exceptions/auto-bid-insufficient-balance.exception';
import { AutoBidNotFoundException } from '../exceptions/auto-bid-not-found.exception';

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
  countByAuctionId: jest.fn().mockResolvedValue(1),
};

const mockAutoBidRepository = {
  findActiveByAuctionId: jest.fn().mockResolvedValue([]),
  findActiveByAuctionAndMaxAmount: jest.fn().mockResolvedValue(null),
  findActiveByAuctionAndUser: jest.fn(),
  findByAuctionAndUser: jest.fn(),
  findByUserId: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  upsert: jest.fn(),
  updateStatus: jest.fn(),
  cancel: jest.fn(),
};

const mockAuctionRepository = {
  findById: jest.fn(),
  updateCurrentPrice: jest.fn(),
};

const mockWalletService = {
  getWalletByUserId: jest.fn().mockResolvedValue({
    balance: '10000',
    heldBalance: '0',
  }),
  hold: jest.fn().mockResolvedValue({
    wallet: {},
    transaction: { _id: new Types.ObjectId() },
  }),
  release: jest.fn().mockResolvedValue({
    wallet: {},
    transaction: { _id: new Types.ObjectId() },
  }),
};

const mockRealtimeService = {
  publishBidAdded: jest.fn().mockResolvedValue(undefined),
};

const mockRedisService = {
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
};

const mockOutboxService = {
  saveEvent: jest.fn().mockResolvedValue(undefined),
};

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  eval: jest.fn().mockResolvedValue(1),
};

describe('AutoBiddingService', () => {
  let service: AutoBiddingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoBiddingService,
        ProxyBiddingEngineService,
        { provide: 'IAutoBidRepository', useValue: mockAutoBidRepository },
        { provide: 'IBidRepository', useValue: mockBidRepository },
        { provide: 'IAuctionRepository', useValue: mockAuctionRepository },
        { provide: WalletService, useValue: mockWalletService },
        { provide: RealtimeService, useValue: mockRealtimeService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: getRedisConnectionToken(), useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AutoBiddingService>(AutoBiddingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setAutoBid', () => {
    const userId = new Types.ObjectId().toString();
    const auctionId = new Types.ObjectId().toString();
    const mockAuction = {
      _id: auctionId,
      sellerId: new Types.ObjectId(),
      status: AuctionStatus.ACTIVE,
      startingPrice: 1000,
      currentPrice: 1000,
      minimumBidIncrement: 100,
      title: 'Luxury Watch',
    };

    it('should set auto-bid and trigger engine calculation', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockBidRepository.findWinningByAuctionId.mockResolvedValue(null);
      mockAutoBidRepository.upsert.mockResolvedValue({
        _id: new Types.ObjectId(),
        auctionId: new Types.ObjectId(auctionId),
        userId: new Types.ObjectId(userId),
        maxAmount: 5000,
        status: AutoBidStatus.ACTIVE,
      });
      mockAutoBidRepository.findActiveByAuctionId.mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(userId),
          maxAmount: 5000,
          createdAt: new Date(),
        },
      ]);
      mockBidRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        bidderId: new Types.ObjectId(userId),
        amount: 1000,
        status: 'WINNING',
      });

      const result = await service.setAutoBid(userId, {
        auctionId,
        maxAmount: 5000,
      });

      expect(result).toBeDefined();
      expect(mockWalletService.getWalletByUserId).toHaveBeenCalledWith(userId);
      expect(mockAutoBidRepository.upsert).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should throw AuctionNotFoundException if auction does not exist', async () => {
      mockAuctionRepository.findById.mockResolvedValue(null);
      await expect(
        service.setAutoBid(userId, { auctionId, maxAmount: 5000 }),
      ).rejects.toThrow(AuctionNotFoundException);
    });

    it('should throw AutoBidOnOwnAuctionException if user is seller', async () => {
      mockAuctionRepository.findById.mockResolvedValue({
        ...mockAuction,
        sellerId: new Types.ObjectId(userId),
      });
      await expect(
        service.setAutoBid(userId, { auctionId, maxAmount: 5000 }),
      ).rejects.toThrow(AutoBidOnOwnAuctionException);
    });

    it('should throw AutoBidMaxTooLowException if maxAmount is lower than minimum required', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockBidRepository.findWinningByAuctionId.mockResolvedValue({
        bidderId: new Types.ObjectId(),
        amount: 2000,
      });
      // minimum required = 1000 + 100 = 1100
      await expect(
        service.setAutoBid(userId, { auctionId, maxAmount: 500 }),
      ).rejects.toThrow(AutoBidMaxTooLowException);
    });

    it('should throw AutoBidInsufficientBalanceException if wallet balance is too low', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockBidRepository.findWinningByAuctionId.mockResolvedValue(null);
      mockWalletService.getWalletByUserId.mockResolvedValueOnce({
        balance: '2000',
        heldBalance: '1000', // available: 1000
      });

      await expect(
        service.setAutoBid(userId, { auctionId, maxAmount: 5000 }),
      ).rejects.toThrow(AutoBidInsufficientBalanceException);
    });
  });

  describe('cancelAutoBid', () => {
    it('should cancel active auto-bid', async () => {
      mockAutoBidRepository.findActiveByAuctionAndUser.mockResolvedValue({
        _id: new Types.ObjectId(),
        status: AutoBidStatus.ACTIVE,
      });
      mockAutoBidRepository.cancel.mockResolvedValue({
        _id: new Types.ObjectId(),
        status: AutoBidStatus.CANCELLED,
      });

      const result = await service.cancelAutoBid('userId', {
        auctionId: 'auctionId',
      });
      expect(result).toBe(true);
      expect(mockAutoBidRepository.cancel).toHaveBeenCalledWith(
        'auctionId',
        'userId',
      );
    });

    it('should throw AutoBidNotFoundException if no active auto-bid found', async () => {
      mockAutoBidRepository.findActiveByAuctionAndUser.mockResolvedValue(null);

      await expect(
        service.cancelAutoBid('userId', { auctionId: 'auctionId' }),
      ).rejects.toThrow(AutoBidNotFoundException);
    });
  });
});
