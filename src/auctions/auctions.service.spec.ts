import { Test, TestingModule } from '@nestjs/testing';
import { AuctionsService } from './auctions.service';
import { UploadService } from '../upload/upload.service';
import { Types } from 'mongoose';
import { AuctionStatus } from './enums/auction-status.enum';
import { AuctionCategory } from './enums/auction-category.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateAuctionInput } from './dto/create-auction.input';
import { UpdateAuctionInput } from './dto/update-auction.input';
import { AuctionsFilterInput } from './dto/auctions-filter.input';
import { AuctionNotFoundException } from './exceptions/auction-not-found.exception';
import { AuctionForbiddenException } from './exceptions/auction-forbidden.exception';
import { AuctionStartTimeTooSoonException } from './exceptions/auction-start-time-too-soon.exception';
import { AuctionEndTimeInvalidException } from './exceptions/auction-end-time-invalid.exception';
import { AuctionInvalidStateException } from './exceptions/auction-invalid-state.exception';
import { AuctionNotPendingException } from './exceptions/auction-not-pending.exception';
import { PaginationInput } from '../common/dto/pagination.input';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';

import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { RedisService } from '../infrastructure/redis/redis.service';

const mockWalletService = {
  release: jest.fn(),
};

const mockRedisService = {
  getOrSetSWR: jest
    .fn()
    .mockImplementation(
      <T>(
        _key: string,
        _soft: number,
        _hard: number,
        fetcher: () => Promise<T>,
      ) => fetcher(),
    ),
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
};

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockAuctionRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  findBySellerId: jest.fn(),
  findByWinnerId: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  updateManyStatus: jest.fn(),
  findPendingToActivate: jest.fn(),
  findActiveToEnd: jest.fn(),
  findWinningBidByAuctionId: jest.fn(),
  startSession: jest.fn().mockResolvedValue(mockSession),
};

const mockNotificationsService = {
  sendAuctionStartedSellerEmail: jest.fn().mockResolvedValue(undefined),
  sendAuctionEndedSellerEmail: jest.fn().mockResolvedValue(undefined),
  createInAppNotification: jest.fn().mockResolvedValue(undefined),
};

const mockUsersService = {
  findById: jest.fn(),
};

describe('AuctionsService', () => {
  let service: AuctionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsService,
        { provide: 'IAuctionRepository', useValue: mockAuctionRepository },
        {
          provide: UploadService,
          useValue: { uploadImage: jest.fn(), deleteImage: jest.fn() },
        },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: WalletService, useValue: mockWalletService },
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

    service = module.get<AuctionsService>(AuctionsService);
    mockAuctionRepository.findWinningBidByAuctionId.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const sellerId = new Types.ObjectId().toString();
  const auctionId = new Types.ObjectId().toString();

  const mockAuction = {
    _id: auctionId,
    sellerId: new Types.ObjectId(sellerId),
    title: 'Test Auction',
    description: 'Test Desc',
    category: AuctionCategory.ELECTRONICS,
    startingPrice: 100,
    currentPrice: 100,
    minimumBidIncrement: 10,
    status: AuctionStatus.PENDING,
    images: [],
    startTime: new Date(Date.now() + 20 * 60 * 1000), // +20 mins
    endTime: new Date(Date.now() + 60 * 60 * 1000), // +1 hour
  };

  describe('createAuction', () => {
    const input: CreateAuctionInput = {
      title: 'Test Auction',
      description: 'Test Desc',
      category: AuctionCategory.ELECTRONICS,
      startingPrice: 100,
      minimumBidIncrement: 10,
      images: [],
      startTime: new Date(Date.now() + 20 * 60 * 1000),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
    };

    it('should create an auction successfully', async () => {
      mockAuctionRepository.create.mockResolvedValue(mockAuction);
      const result = await service.createAuction(sellerId, input);
      expect(result).toEqual(mockAuction);
      expect(mockAuctionRepository.create).toHaveBeenCalled();
    });

    it('should throw AuctionStartTimeTooSoonException if start time is < 15 mins', async () => {
      const invalidInput = {
        ...input,
        startTime: new Date(Date.now() + 10 * 60 * 1000),
      };
      await expect(
        service.createAuction(sellerId, invalidInput),
      ).rejects.toThrow(AuctionStartTimeTooSoonException);
    });

    it('should throw AuctionEndTimeInvalidException if end time <= start time', async () => {
      const invalidInput = {
        ...input,
        endTime: new Date(Date.now() + 10 * 60 * 1000),
      }; // before valid startTime
      await expect(
        service.createAuction(sellerId, invalidInput),
      ).rejects.toThrow(AuctionEndTimeInvalidException);
    });
  });

  describe('find queries', () => {
    const filter = new AuctionsFilterInput();
    const pagination: PaginationInput = { page: 1, limit: 10 };
    const mockPageResult = { items: [mockAuction], total: 1 };

    it('findAuctions should return paginated result and exclude CANCELLED', async () => {
      mockAuctionRepository.findAll.mockResolvedValue(mockPageResult);
      const result = await service.findAuctions(pagination, filter);
      expect(result.items).toEqual(mockPageResult.items);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockAuctionRepository.findAll).toHaveBeenCalledWith(
        pagination.page,
        pagination.limit,
        filter,
        [AuctionStatus.CANCELLED],
      );
    });

    it('findAllForAdmin should return all statuses', async () => {
      mockAuctionRepository.findAll.mockResolvedValue(mockPageResult);
      const result = await service.findAllForAdmin(pagination, filter);
      expect(result.total).toBe(1);
      expect(mockAuctionRepository.findAll).toHaveBeenCalledWith(
        pagination.page,
        pagination.limit,
        filter,
      );
    });

    it('findAuction should return single auction', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      const result = await service.findAuction(auctionId);
      expect(result).toEqual(mockAuction);
    });

    it('findAuction should throw AuctionNotFoundException if missing', async () => {
      mockAuctionRepository.findById.mockResolvedValue(null);
      await expect(service.findAuction(auctionId)).rejects.toThrow(
        AuctionNotFoundException,
      );
    });

    it('findMyAuctions should return paginated result', async () => {
      mockAuctionRepository.findBySellerId.mockResolvedValue(mockPageResult);
      const result = await service.findMyAuctions(sellerId, pagination, filter);
      expect(result.total).toBe(1);
      expect(mockAuctionRepository.findBySellerId).toHaveBeenCalledWith(
        sellerId,
        pagination.page,
        pagination.limit,
        filter,
      );
    });

    it('findWonAuctions should return paginated result', async () => {
      mockAuctionRepository.findByWinnerId.mockResolvedValue(mockPageResult);
      const result = await service.findWonAuctions(
        sellerId,
        pagination,
        filter,
      );
      expect(result.total).toBe(1);
      expect(mockAuctionRepository.findByWinnerId).toHaveBeenCalledWith(
        sellerId,
        pagination.page,
        pagination.limit,
        filter,
      );
    });
  });

  describe('updateAuction', () => {
    const updateInput: UpdateAuctionInput = { title: 'Updated' };

    it('should update successfully if owner and pending', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockAuctionRepository.update.mockResolvedValue({
        ...mockAuction,
        title: 'Updated',
      });

      const result = await service.updateAuction(
        auctionId,
        sellerId,
        updateInput,
      );
      expect(result.title).toBe('Updated');
    });

    it('should throw AuctionForbiddenException if not owner', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      await expect(
        service.updateAuction(auctionId, 'otherUserId', updateInput),
      ).rejects.toThrow(AuctionForbiddenException);
    });

    it('should throw AuctionNotPendingException if not pending', async () => {
      const activeAuction = { ...mockAuction, status: AuctionStatus.ACTIVE };
      mockAuctionRepository.findById.mockResolvedValue(activeAuction);
      await expect(
        service.updateAuction(auctionId, sellerId, updateInput),
      ).rejects.toThrow(AuctionNotPendingException);
    });
  });

  describe('cancelAuction', () => {
    it('should cancel successfully as owner', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockAuctionRepository.updateStatus.mockResolvedValue(undefined);

      const result = await service.cancelAuction(
        auctionId,
        sellerId,
        UserRole.USER,
      );
      expect(result).toBe(true);
      expect(mockAuctionRepository.updateStatus).toHaveBeenCalledWith(
        auctionId,
        AuctionStatus.CANCELLED,
        mockSession,
      );
    });

    it('should cancel successfully as admin (not owner)', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockAuctionRepository.updateStatus.mockResolvedValue(undefined);

      const result = await service.cancelAuction(
        auctionId,
        'adminId',
        UserRole.ADMIN,
      );
      expect(result).toBe(true);
    });

    it('should throw AuctionForbiddenException if not owner and not admin', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      await expect(
        service.cancelAuction(auctionId, 'otherUserId', UserRole.USER),
      ).rejects.toThrow(AuctionForbiddenException);
    });

    it('should throw AuctionInvalidStateException if auction is ENDED', async () => {
      const endedAuction = { ...mockAuction, status: AuctionStatus.ENDED };
      mockAuctionRepository.findById.mockResolvedValue(endedAuction);
      await expect(
        service.cancelAuction(auctionId, sellerId, UserRole.USER),
      ).rejects.toThrow(AuctionInvalidStateException);
    });
  });

  describe('Cron Jobs', () => {
    it('should activate pending auctions', async () => {
      mockAuctionRepository.findPendingToActivate.mockResolvedValue([
        mockAuction,
      ]);
      await service.activatePendingAuctions();
      expect(mockAuctionRepository.updateManyStatus).toHaveBeenCalledWith(
        [mockAuction._id],
        AuctionStatus.ACTIVE,
      );
    });

    it('should do nothing if no pending auctions to activate', async () => {
      mockAuctionRepository.findPendingToActivate.mockResolvedValue([]);
      await service.activatePendingAuctions();
      expect(mockAuctionRepository.updateManyStatus).not.toHaveBeenCalled();
    });

    it('should end active auctions', async () => {
      mockAuctionRepository.findActiveToEnd.mockResolvedValue([mockAuction]);
      await service.endActiveAuctions();
      expect(mockAuctionRepository.updateManyStatus).toHaveBeenCalledWith(
        [mockAuction._id],
        AuctionStatus.ENDED,
      );
    });
  });
});
