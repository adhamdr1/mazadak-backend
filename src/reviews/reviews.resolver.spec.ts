import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsResolver } from './reviews.resolver';
import { ReviewsService } from './reviews.service';
import { QueryBus } from '@nestjs/cqrs';
import { Types } from 'mongoose';
import { Review } from './entities/review.entity';
import { ReviewStatus } from './enums/review-status.enum';
import { ReviewType } from './enums/review-type.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRatingStats } from './entities/user-rating-stats.entity';
import { GetUserPublicProfileQuery } from '../users/queries/get-user-public-profile.query';
import { GetAuctionByIdQuery } from '../auctions/queries/get-auction-by-id.query';

const mockReviewsService = {
  getReviewsForUser: jest.fn(),
  getReviewsByReviewer: jest.fn(),
  getUserRatingStats: jest.fn(),
  canUserReviewAuction: jest.fn(),
  getReviewById: jest.fn(),
  getAdminAuctionReviews: jest.fn(),
  createReview: jest.fn(),
  replyToReview: jest.fn(),
  hideReview: jest.fn(),
  unhideReview: jest.fn(),
};

const mockQueryBus = {
  execute: jest.fn(),
};

describe('ReviewsResolver', () => {
  let resolver: ReviewsResolver;

  const currentUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    email: 'user@example.com',
    role: UserRole.USER,
  };

  const reviewId = new Types.ObjectId().toString();
  const auctionId = new Types.ObjectId().toString();
  const reviewerId = new Types.ObjectId().toString();
  const reviewedUserId = new Types.ObjectId().toString();

  const mockReview: Review = {
    _id: new Types.ObjectId(reviewId),
    auctionId: new Types.ObjectId(auctionId),
    reviewerId: new Types.ObjectId(reviewerId),
    reviewedUserId: new Types.ObjectId(reviewedUserId),
    type: ReviewType.BUYER_TO_SELLER,
    status: ReviewStatus.PUBLISHED,
    overallRating: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsResolver,
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    resolver = module.get<ReviewsResolver>(ReviewsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('Field Resolvers', () => {
    it('should resolve reviewer via QueryBus', async () => {
      const mockProfile = { id: reviewerId, username: 'reviewer1' };
      mockQueryBus.execute.mockResolvedValue(mockProfile);

      const result = await resolver.reviewer(mockReview);

      expect(result).toEqual(mockProfile);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        new GetUserPublicProfileQuery(reviewerId),
      );
    });

    it('should return null if reviewerId is missing', async () => {
      const result = await resolver.reviewer({} as Review);
      expect(result).toBeNull();
    });

    it('should resolve reviewedUser via QueryBus', async () => {
      const mockProfile = { id: reviewedUserId, username: 'reviewed1' };
      mockQueryBus.execute.mockResolvedValue(mockProfile);

      const result = await resolver.reviewedUser(mockReview);

      expect(result).toEqual(mockProfile);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        new GetUserPublicProfileQuery(reviewedUserId),
      );
    });

    it('should return null if reviewedUserId is missing', async () => {
      const result = await resolver.reviewedUser({} as Review);
      expect(result).toBeNull();
    });

    it('should resolve auction via QueryBus', async () => {
      const mockAuction = { id: auctionId, title: 'Auction 1' };
      mockQueryBus.execute.mockResolvedValue(mockAuction);

      const result = await resolver.auction(mockReview);

      expect(result).toEqual(mockAuction);
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        new GetAuctionByIdQuery(auctionId),
      );
    });

    it('should return null if auctionId is missing', async () => {
      const result = await resolver.auction({} as Review);
      expect(result).toBeNull();
    });
  });

  describe('Queries', () => {
    it('should call getReviewsForUser', async () => {
      const mockPage = {
        items: [mockReview],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockReviewsService.getReviewsForUser.mockResolvedValue(mockPage);

      const result = await resolver.getUserReviews(reviewedUserId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(mockPage);
      expect(mockReviewsService.getReviewsForUser).toHaveBeenCalledWith(
        reviewedUserId,
        undefined,
        undefined,
        1,
        10,
      );
    });

    it('should call getMyWrittenReviews', async () => {
      const mockPage = {
        items: [mockReview],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockReviewsService.getReviewsByReviewer.mockResolvedValue(mockPage);

      const result = await resolver.getMyWrittenReviews(currentUser, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(mockPage);
      expect(mockReviewsService.getReviewsByReviewer).toHaveBeenCalledWith(
        currentUser.sub,
        1,
        10,
      );
    });

    it('should call getUserRatingStats', async () => {
      const mockStats: UserRatingStats = {
        averageRating: 4.9,
        totalReviews: 10,
        asSellerAverageRating: 4.9,
        asSellerTotalReviews: 8,
        asBuyerAverageRating: 5.0,
        asBuyerTotalReviews: 2,
        breakdown: {
          fiveStar: 9,
          fourStar: 1,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0,
        },
      };
      mockReviewsService.getUserRatingStats.mockResolvedValue(mockStats);

      const result = await resolver.getUserRatingStats(reviewedUserId);

      expect(result).toEqual(mockStats);
      expect(mockReviewsService.getUserRatingStats).toHaveBeenCalledWith(
        reviewedUserId,
      );
    });

    it('should call canReviewAuction', async () => {
      mockReviewsService.canUserReviewAuction.mockResolvedValue({
        canReview: true,
      });

      const result = await resolver.canReviewAuction(currentUser, auctionId);

      expect(result).toEqual({ canReview: true });
      expect(mockReviewsService.canUserReviewAuction).toHaveBeenCalledWith(
        currentUser.sub,
        auctionId,
      );
    });

    it('should call getReview', async () => {
      mockReviewsService.getReviewById.mockResolvedValue(mockReview);

      const result = await resolver.getReview(reviewId);

      expect(result).toEqual(mockReview);
      expect(mockReviewsService.getReviewById).toHaveBeenCalledWith(reviewId);
    });

    it('should call getAdminAuctionReviews', async () => {
      mockReviewsService.getAdminAuctionReviews.mockResolvedValue([mockReview]);

      const result = await resolver.getAdminAuctionReviews(auctionId);

      expect(result).toEqual([mockReview]);
      expect(mockReviewsService.getAdminAuctionReviews).toHaveBeenCalledWith(
        auctionId,
      );
    });
  });

  describe('Mutations', () => {
    it('should call createReview', async () => {
      const input = { auctionId, overallRating: 5, comment: 'Nice' };
      mockReviewsService.createReview.mockResolvedValue(mockReview);

      const result = await resolver.createReview(currentUser, input);

      expect(result).toEqual(mockReview);
      expect(mockReviewsService.createReview).toHaveBeenCalledWith(
        currentUser.sub,
        input,
      );
    });

    it('should call replyToReview', async () => {
      const input = { reviewId, reply: 'Thanks' };
      const repliedReview = { ...mockReview, reply: 'Thanks' };
      mockReviewsService.replyToReview.mockResolvedValue(repliedReview);

      const result = await resolver.replyToReview(currentUser, input);

      expect(result).toEqual(repliedReview);
      expect(mockReviewsService.replyToReview).toHaveBeenCalledWith(
        currentUser.sub,
        input,
      );
    });

    it('should call hideReview', async () => {
      const hiddenReview = { ...mockReview, status: ReviewStatus.HIDDEN };
      mockReviewsService.hideReview.mockResolvedValue(hiddenReview);

      const result = await resolver.hideReview(reviewId);

      expect(result).toEqual(hiddenReview);
      expect(mockReviewsService.hideReview).toHaveBeenCalledWith(reviewId);
    });

    it('should call unhideReview', async () => {
      mockReviewsService.unhideReview.mockResolvedValue(mockReview);

      const result = await resolver.unhideReview(reviewId);

      expect(result).toEqual(mockReview);
      expect(mockReviewsService.unhideReview).toHaveBeenCalledWith(reviewId);
    });
  });
});
