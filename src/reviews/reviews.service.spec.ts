import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { AuctionsService } from '../auctions/auctions.service';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { Types } from 'mongoose';
import { ReviewStatus } from './enums/review-status.enum';
import { ReviewType } from './enums/review-type.enum';
import { AuctionStatus } from '../auctions/enums/auction-status.enum';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import {
  ReviewAlreadyExistsException,
  ReviewNotEligibleException,
  ReviewNotFoundException,
  ReviewReplyForbiddenException,
  ReviewSelfRatingException,
  ReviewWindowExpiredException,
} from './exceptions';
import { Review } from './entities/review.entity';
import { UserRatingStats } from './entities/user-rating-stats.entity';
import { CreateReviewInput } from './dto/create-review.input';
import { ReplyReviewInput } from './dto/reply-review.input';
import { Auction } from '../auctions/entities/auction.entity';

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockReviewsRepository = {
  startSession: jest.fn().mockResolvedValue(mockSession),
  create: jest.fn(),
  findById: jest.fn(),
  findByAuction: jest.fn(),
  findByAuctionAndReviewer: jest.fn(),
  findUserReviews: jest.fn(),
  findReviewsByReviewer: jest.fn(),
  getUserRatingStats: jest.fn(),
  updateStatus: jest.fn(),
  addReply: jest.fn(),
  findPendingReviewsOlderThan: jest.fn(),
};

const mockAuctionsService = {
  findAuction: jest.fn(),
};

const mockOutboxService = {
  saveEvent: jest.fn(),
};

const mockRedisService = {
  getOrSetSWR: jest.fn(
    (_key, _softTtl, _hardTtl, factory: () => Promise<unknown>) => factory(),
  ),
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: 'IReviewsRepository',
          useValue: mockReviewsRepository,
        },
        {
          provide: AuctionsService,
          useValue: mockAuctionsService,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const reviewId = new Types.ObjectId().toString();
  const auctionId = new Types.ObjectId().toString();
  const buyerId = new Types.ObjectId().toString();
  const sellerId = new Types.ObjectId().toString();

  const mockAuction: Auction = {
    _id: new Types.ObjectId(auctionId),
    sellerId: new Types.ObjectId(sellerId),
    winnerId: new Types.ObjectId(buyerId),
    status: AuctionStatus.ENDED,
    endTime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    title: 'Test Auction',
    description: 'Desc',
    startPrice: Types.Decimal128.fromString('100.00'),
    currentBid: Types.Decimal128.fromString('200.00'),
    minBidIncrement: Types.Decimal128.fromString('10.00'),
    durationDays: 7,
    itemCondition: 'NEW',
    category: 'Electronics',
    images: [],
    bidCount: 5,
    isExtended: false,
    autoExtendMinutes: 5,
    viewCount: 10,
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Auction;

  const mockReview: Review = {
    _id: new Types.ObjectId(reviewId),
    auctionId: new Types.ObjectId(auctionId),
    reviewerId: new Types.ObjectId(buyerId),
    reviewedUserId: new Types.ObjectId(sellerId),
    type: ReviewType.BUYER_TO_SELLER,
    status: ReviewStatus.PENDING,
    overallRating: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('createReview', () => {
    const input: CreateReviewInput = {
      auctionId,
      overallRating: 5,
      comment: 'Great seller!',
    };

    it('should throw ReviewNotEligibleException if auction is not ENDED', async () => {
      mockAuctionsService.findAuction.mockResolvedValue({
        ...mockAuction,
        status: AuctionStatus.ACTIVE,
      });

      await expect(service.createReview(buyerId, input)).rejects.toThrow(
        ReviewNotEligibleException,
      );
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('should throw ReviewSelfRatingException if seller is winner', async () => {
      mockAuctionsService.findAuction.mockResolvedValue({
        ...mockAuction,
        sellerId: new Types.ObjectId(buyerId),
        winnerId: new Types.ObjectId(buyerId),
      });

      await expect(service.createReview(buyerId, input)).rejects.toThrow(
        ReviewSelfRatingException,
      );
    });

    it('should throw ReviewNotEligibleException if reviewer is neither buyer nor seller', async () => {
      mockAuctionsService.findAuction.mockResolvedValue(mockAuction);
      const strangerId = new Types.ObjectId().toString();

      await expect(service.createReview(strangerId, input)).rejects.toThrow(
        ReviewNotEligibleException,
      );
    });

    it('should throw ReviewWindowExpiredException if review window passed 14 days', async () => {
      mockAuctionsService.findAuction.mockResolvedValue({
        ...mockAuction,
        endTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      });

      await expect(service.createReview(buyerId, input)).rejects.toThrow(
        ReviewWindowExpiredException,
      );
    });

    it('should throw ReviewAlreadyExistsException if reviewer already reviewed auction', async () => {
      mockAuctionsService.findAuction.mockResolvedValue(mockAuction);
      mockReviewsRepository.findByAuctionAndReviewer.mockResolvedValue(
        mockReview,
      );

      await expect(service.createReview(buyerId, input)).rejects.toThrow(
        ReviewAlreadyExistsException,
      );
    });

    it('should create PENDING review if counterpart has not reviewed yet (blind review)', async () => {
      mockAuctionsService.findAuction.mockResolvedValue(mockAuction);
      mockReviewsRepository.findByAuctionAndReviewer.mockResolvedValue(null);
      mockReviewsRepository.findByAuction.mockResolvedValue([]);
      mockReviewsRepository.create.mockResolvedValue(mockReview);
      mockOutboxService.saveEvent.mockResolvedValue(undefined);

      const result = await service.createReview(buyerId, input);

      expect(result).toEqual(mockReview);
      expect(mockReviewsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.PENDING,
          type: ReviewType.BUYER_TO_SELLER,
        }),
        mockSession,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledWith(
        RabbitMQEvent.ReviewCreated,
        expect.objectContaining({
          status: ReviewStatus.PENDING,
        }),
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should publish BOTH reviews if counterpart has already submitted pending review', async () => {
      const counterpartReview: Review = {
        _id: new Types.ObjectId(),
        auctionId: new Types.ObjectId(auctionId),
        reviewerId: new Types.ObjectId(sellerId),
        reviewedUserId: new Types.ObjectId(buyerId),
        type: ReviewType.SELLER_TO_BUYER,
        status: ReviewStatus.PENDING,
        overallRating: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const publishedReview: Review = {
        ...mockReview,
        status: ReviewStatus.PUBLISHED,
        publishedAt: new Date(),
      };

      mockAuctionsService.findAuction.mockResolvedValue(mockAuction);
      mockReviewsRepository.findByAuctionAndReviewer.mockResolvedValue(null);
      mockReviewsRepository.findByAuction.mockResolvedValue([
        counterpartReview,
      ]);
      mockReviewsRepository.create.mockResolvedValue(publishedReview);
      mockReviewsRepository.updateStatus.mockResolvedValue(undefined);
      mockOutboxService.saveEvent.mockResolvedValue(undefined);

      const result = await service.createReview(buyerId, input);

      expect(result).toEqual(publishedReview);
      expect(mockReviewsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.PUBLISHED,
        }),
        mockSession,
      );
      expect(mockReviewsRepository.updateStatus).toHaveBeenCalledWith(
        counterpartReview._id.toString(),
        ReviewStatus.PUBLISHED,
        expect.any(Date),
        mockSession,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledTimes(2);
      expect(mockRedisService.invalidatePattern).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('replyToReview', () => {
    const input: ReplyReviewInput = {
      reviewId,
      reply: 'Thank you for your feedback!',
    };

    it('should throw ReviewNotFoundException if review does not exist', async () => {
      mockReviewsRepository.findById.mockResolvedValue(null);

      await expect(service.replyToReview(sellerId, input)).rejects.toThrow(
        ReviewNotFoundException,
      );
    });

    it('should throw ReviewReplyForbiddenException if replier is not the reviewed user', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview);

      await expect(service.replyToReview(buyerId, input)).rejects.toThrow(
        ReviewReplyForbiddenException,
      );
    });

    it('should throw ReviewReplyForbiddenException if review is not PUBLISHED', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview); // status: PENDING

      await expect(service.replyToReview(sellerId, input)).rejects.toThrow(
        ReviewReplyForbiddenException,
      );
    });

    it('should throw ReviewReplyForbiddenException if review already has a reply', async () => {
      const alreadyRepliedReview: Review = {
        ...mockReview,
        status: ReviewStatus.PUBLISHED,
        reply: 'Existing reply',
      };
      mockReviewsRepository.findById.mockResolvedValue(alreadyRepliedReview);

      await expect(service.replyToReview(sellerId, input)).rejects.toThrow(
        ReviewReplyForbiddenException,
      );
    });

    it('should add reply to review successfully', async () => {
      const publishedReview: Review = {
        ...mockReview,
        status: ReviewStatus.PUBLISHED,
      };
      const repliedReview: Review = {
        ...publishedReview,
        reply: input.reply,
        repliedAt: new Date(),
      };

      mockReviewsRepository.findById.mockResolvedValue(publishedReview);
      mockReviewsRepository.addReply.mockResolvedValue(repliedReview);
      mockOutboxService.saveEvent.mockResolvedValue(undefined);

      const result = await service.replyToReview(sellerId, input);

      expect(result).toEqual(repliedReview);
      expect(mockReviewsRepository.addReply).toHaveBeenCalledWith(
        reviewId,
        input.reply,
        mockSession,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledWith(
        RabbitMQEvent.ReviewReplied,
        expect.objectContaining({
          reviewId,
          replierId: sellerId,
        }),
        mockSession,
      );
      expect(mockRedisService.invalidatePattern).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('getReviewsForUser and getReviewsByReviewer', () => {
    it('should return paginated reviews for a user', async () => {
      const pageResult = { items: [mockReview], total: 1 };
      mockReviewsRepository.findUserReviews.mockResolvedValue(pageResult);

      const result = await service.getReviewsForUser(sellerId);

      expect(result).toEqual({
        items: [mockReview],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      });
    });

    it('should return paginated reviews by a reviewer', async () => {
      const pageResult = { items: [mockReview], total: 1 };
      mockReviewsRepository.findReviewsByReviewer.mockResolvedValue(pageResult);

      const result = await service.getReviewsByReviewer(buyerId);

      expect(result).toEqual({
        items: [mockReview],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      });
    });
  });

  describe('getUserRatingStats and getReviewById', () => {
    it('should return user rating stats', async () => {
      const stats: UserRatingStats = {
        averageRating: 4.8,
        totalReviews: 20,
        asSellerAverageRating: 4.8,
        asSellerTotalReviews: 15,
        asBuyerAverageRating: 5.0,
        asBuyerTotalReviews: 5,
        breakdown: {
          fiveStar: 16,
          fourStar: 4,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0,
        },
      };

      mockReviewsRepository.getUserRatingStats.mockResolvedValue(stats);

      const result = await service.getUserRatingStats(sellerId);

      expect(result).toEqual(stats);
    });

    it('should return review by id', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview);

      const result = await service.getReviewById(reviewId);

      expect(result).toEqual(mockReview);
    });

    it('should throw ReviewNotFoundException if review by id not found', async () => {
      mockReviewsRepository.findById.mockResolvedValue(null);

      await expect(service.getReviewById(reviewId)).rejects.toThrow(
        ReviewNotFoundException,
      );
    });
  });

  describe('publishExpiredPendingReviews', () => {
    it('should auto-publish expired pending reviews', async () => {
      mockReviewsRepository.findPendingReviewsOlderThan.mockResolvedValue([
        mockReview,
      ]);
      mockReviewsRepository.updateStatus.mockResolvedValue(undefined);
      mockOutboxService.saveEvent.mockResolvedValue(undefined);

      const count = await service.publishExpiredPendingReviews();

      expect(count).toBe(1);
      expect(mockReviewsRepository.updateStatus).toHaveBeenCalledWith(
        reviewId,
        ReviewStatus.PUBLISHED,
        expect.any(Date),
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('canUserReviewAuction', () => {
    it('should return canReview: true when user is eligible', async () => {
      mockAuctionsService.findAuction.mockResolvedValue(mockAuction);
      mockReviewsRepository.findByAuctionAndReviewer.mockResolvedValue(null);

      const result = await service.canUserReviewAuction(buyerId, auctionId);

      expect(result).toEqual({ canReview: true });
    });

    it('should return canReview: false if already reviewed', async () => {
      mockAuctionsService.findAuction.mockResolvedValue(mockAuction);
      mockReviewsRepository.findByAuctionAndReviewer.mockResolvedValue(
        mockReview,
      );

      const result = await service.canUserReviewAuction(buyerId, auctionId);

      expect(result.canReview).toBe(false);
      expect(result.reason).toContain('already submitted');
    });
  });

  describe('admin moderation: hideReview, unhideReview, getAdminAuctionReviews', () => {
    it('should hide review and invalidate cache', async () => {
      const hiddenReview: Review = {
        ...mockReview,
        status: ReviewStatus.HIDDEN,
      };
      mockReviewsRepository.findById.mockResolvedValue(mockReview);
      mockReviewsRepository.updateStatus.mockResolvedValue(hiddenReview);

      const result = await service.hideReview(reviewId);

      expect(result).toEqual(hiddenReview);
      expect(mockReviewsRepository.updateStatus).toHaveBeenCalledWith(
        reviewId,
        ReviewStatus.HIDDEN,
      );
      expect(mockRedisService.invalidatePattern).toHaveBeenCalled();
    });

    it('should unhide review and invalidate cache', async () => {
      const publishedReview: Review = {
        ...mockReview,
        status: ReviewStatus.PUBLISHED,
      };
      mockReviewsRepository.findById.mockResolvedValue(mockReview);
      mockReviewsRepository.updateStatus.mockResolvedValue(publishedReview);

      const result = await service.unhideReview(reviewId);

      expect(result).toEqual(publishedReview);
      expect(mockReviewsRepository.updateStatus).toHaveBeenCalledWith(
        reviewId,
        ReviewStatus.PUBLISHED,
      );
      expect(mockRedisService.invalidatePattern).toHaveBeenCalled();
    });

    it('should return all reviews for admin', async () => {
      mockReviewsRepository.findByAuction.mockResolvedValue([mockReview]);

      const result = await service.getAdminAuctionReviews(auctionId);

      expect(result).toEqual([mockReview]);
    });
  });
});
