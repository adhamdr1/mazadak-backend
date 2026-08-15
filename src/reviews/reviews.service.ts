import { Injectable, Inject, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import type { IReviewsRepository } from './interfaces/reviews.repository.interface';
import { Review } from './entities/review.entity';
import { CreateReviewInput } from './dto/create-review.input';
import { ReplyReviewInput } from './dto/reply-review.input';
import { ReviewsFilterInput } from './dto/reviews-filter.input';
import { ReviewsSortInput } from './dto/reviews-sort.input';
import { ReviewsPage } from './dto/reviews-page.type';
import { UserRatingStats } from './entities/user-rating-stats.entity';
import { ReviewStatus } from './enums/review-status.enum';
import { ReviewType } from './enums/review-type.enum';
import { AuctionsService } from '../auctions/auctions.service';
import { AuctionStatus } from '../auctions/enums/auction-status.enum';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { RedisService } from '../infrastructure/redis/redis.service';
import {
  ReviewAlreadyExistsException,
  ReviewNotEligibleException,
  ReviewNotFoundException,
  ReviewReplyForbiddenException,
  ReviewSelfRatingException,
  ReviewWindowExpiredException,
} from './exceptions';

const REVIEW_WINDOW_DAYS = 14;

// Cache TTLs
const REVIEWS_USER_SOFT_TTL_MS = 60 * 1000; // 1 minute
const REVIEWS_USER_HARD_TTL_S = 10 * 60; // 10 minutes

const REVIEWS_STATS_SOFT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REVIEWS_STATS_HARD_TTL_S = 60 * 60; // 1 hour

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @Inject('IReviewsRepository')
    private readonly reviewsRepository: IReviewsRepository,
    private readonly auctionsService: AuctionsService,
    private readonly outboxService: OutboxService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Helper to invalidate cache for a user's reviews and stats
   */
  private invalidateUserReviewsCache(userId: string): void {
    void this.redisService.invalidatePattern(`reviews:user:${userId}:*`);
    void this.redisService.invalidatePattern(`reviews:stats:${userId}`);
  }

  /**
   * Submits a new review with full eligibility validation and mutual blind reveal logic.
   */
  async createReview(
    reviewerId: string,
    input: CreateReviewInput,
  ): Promise<Review> {
    const session = await this.reviewsRepository.startSession();
    session.startTransaction();

    try {
      const auction = await this.auctionsService.findAuction(input.auctionId);

      if (auction.status !== AuctionStatus.ENDED || !auction.winnerId) {
        throw new ReviewNotEligibleException();
      }

      const sellerIdStr = auction.sellerId.toString();
      const winnerIdStr = auction.winnerId.toString();

      if (sellerIdStr === winnerIdStr) {
        throw new ReviewSelfRatingException();
      }

      let type: ReviewType;
      let reviewedUserId: Types.ObjectId;

      if (reviewerId === winnerIdStr) {
        type = ReviewType.BUYER_TO_SELLER;
        reviewedUserId = auction.sellerId;
      } else if (reviewerId === sellerIdStr) {
        type = ReviewType.SELLER_TO_BUYER;
        reviewedUserId = auction.winnerId;
      } else {
        throw new ReviewNotEligibleException();
      }

      // Check review eligibility window (14 days from auction endTime)
      const auctionEndTime = new Date(auction.endTime).getTime();
      const windowDurationMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - auctionEndTime > windowDurationMs) {
        throw new ReviewWindowExpiredException();
      }

      // Check idempotency / duplicate review
      const existingReview =
        await this.reviewsRepository.findByAuctionAndReviewer(
          input.auctionId,
          reviewerId,
          session,
        );
      if (existingReview) {
        throw new ReviewAlreadyExistsException();
      }

      // Mutual Blind Reveal Logic
      const allAuctionReviews = await this.reviewsRepository.findByAuction(
        input.auctionId,
        session,
      );

      const counterpartReview = allAuctionReviews.find(
        (r) => r.reviewerId.toString() === reviewedUserId.toString(),
      );

      let createdReview: Review;

      if (
        counterpartReview &&
        counterpartReview.status === ReviewStatus.PENDING
      ) {
        // Both parties have submitted their review -> Reveal both!
        const now = new Date();

        createdReview = await this.reviewsRepository.create(
          {
            auctionId: new Types.ObjectId(input.auctionId),
            reviewerId: new Types.ObjectId(reviewerId),
            reviewedUserId,
            type,
            status: ReviewStatus.PUBLISHED,
            overallRating: input.overallRating,
            criteria: input.criteria,
            comment: input.comment,
            publishedAt: now,
          },
          session,
        );

        await this.reviewsRepository.updateStatus(
          counterpartReview._id.toString(),
          ReviewStatus.PUBLISHED,
          now,
          session,
        );

        // Save domain events to Outbox for both published reviews
        await this.outboxService.saveEvent(
          RabbitMQEvent.ReviewPublished,
          {
            reviewId: createdReview._id.toString(),
            auctionId: input.auctionId,
            reviewerId,
            reviewedUserId: reviewedUserId.toString(),
            overallRating: createdReview.overallRating,
            type: createdReview.type,
          },
          session,
        );

        await this.outboxService.saveEvent(
          RabbitMQEvent.ReviewPublished,
          {
            reviewId: counterpartReview._id.toString(),
            auctionId: input.auctionId,
            reviewerId: counterpartReview.reviewerId.toString(),
            reviewedUserId: counterpartReview.reviewedUserId.toString(),
            overallRating: counterpartReview.overallRating,
            type: counterpartReview.type,
          },
          session,
        );

        // Invalidate cache for both reviewed users
        this.invalidateUserReviewsCache(reviewedUserId.toString());
        this.invalidateUserReviewsCache(reviewerId);
      } else {
        // First party submitted -> Keep review pending (blind review)
        createdReview = await this.reviewsRepository.create(
          {
            auctionId: new Types.ObjectId(input.auctionId),
            reviewerId: new Types.ObjectId(reviewerId),
            reviewedUserId,
            type,
            status: ReviewStatus.PENDING,
            overallRating: input.overallRating,
            criteria: input.criteria,
            comment: input.comment,
          },
          session,
        );

        await this.outboxService.saveEvent(
          RabbitMQEvent.ReviewCreated,
          {
            reviewId: createdReview._id.toString(),
            auctionId: input.auctionId,
            reviewerId,
            reviewedUserId: reviewedUserId.toString(),
            type: createdReview.type,
            status: createdReview.status,
          },
          session,
        );
      }

      await session.commitTransaction();
      return createdReview;
    } catch (error: unknown) {
      await session.abortTransaction();
      // Handle MongoDB duplicate compound index error (E11000) under concurrency
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new ReviewAlreadyExistsException();
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Adds a single public reply to an existing published review.
   */
  async replyToReview(
    replierId: string,
    input: ReplyReviewInput,
  ): Promise<Review> {
    const session = await this.reviewsRepository.startSession();
    session.startTransaction();

    try {
      const review = await this.reviewsRepository.findById(
        input.reviewId,
        session,
      );
      if (!review) {
        throw new ReviewNotFoundException();
      }

      if (review.reviewedUserId.toString() !== replierId) {
        throw new ReviewReplyForbiddenException(
          'Only the reviewed user can reply to this review',
        );
      }

      if (review.status !== ReviewStatus.PUBLISHED) {
        throw new ReviewReplyForbiddenException(
          'Cannot reply to a review that is not yet published',
        );
      }

      if (review.reply) {
        throw new ReviewReplyForbiddenException(
          'A reply has already been submitted for this review',
        );
      }

      const updatedReview = await this.reviewsRepository.addReply(
        input.reviewId,
        input.reply,
        session,
      );

      await this.outboxService.saveEvent(
        RabbitMQEvent.ReviewReplied,
        {
          reviewId: input.reviewId,
          auctionId: review.auctionId.toString(),
          reviewerId: review.reviewerId.toString(),
          replierId,
        },
        session,
      );

      // Invalidate cache for the reviewed user's reviews list
      this.invalidateUserReviewsCache(review.reviewedUserId.toString());

      await session.commitTransaction();
      return updatedReview!;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Retrieves paginated published reviews for a specific user with filtering, sorting, and Redis caching.
   */
  async getReviewsForUser(
    userId: string,
    filter?: ReviewsFilterInput,
    sort?: ReviewsSortInput,
    page = 1,
    limit = 10,
  ): Promise<ReviewsPage> {
    const cacheKey =
      `reviews:user:${userId}` +
      `:t:${filter?.type ?? 'all'}` +
      `:r:${filter?.minRating ?? 'all'}` +
      `:s:${sort?.field ?? 'created'}:${sort?.order ?? 'desc'}` +
      `:p:${page}:l:${limit}`;

    return this.redisService.getOrSetSWR(
      cacheKey,
      REVIEWS_USER_SOFT_TTL_MS,
      REVIEWS_USER_HARD_TTL_S,
      async () => {
        const { items, total } = await this.reviewsRepository.findUserReviews(
          userId,
          filter,
          sort,
          page,
          limit,
        );

        const totalPages = Math.ceil(total / limit) || 1;
        const hasNextPage = page < totalPages;

        return {
          items,
          total,
          totalPages,
          hasNextPage,
        };
      },
    );
  }

  /**
   * Retrieves paginated reviews written by a specific reviewer.
   */
  async getReviewsByReviewer(
    reviewerId: string,
    page = 1,
    limit = 10,
  ): Promise<ReviewsPage> {
    const { items, total } = await this.reviewsRepository.findReviewsByReviewer(
      reviewerId,
      page,
      limit,
    );

    const totalPages = Math.ceil(total / limit) || 1;
    const hasNextPage = page < totalPages;

    return {
      items,
      total,
      totalPages,
      hasNextPage,
    };
  }

  /**
   * Retrieves aggregated rating statistics for a specific user with Redis SWR caching.
   */
  async getUserRatingStats(userId: string): Promise<UserRatingStats> {
    const cacheKey = `reviews:stats:${userId}`;
    return this.redisService.getOrSetSWR(
      cacheKey,
      REVIEWS_STATS_SOFT_TTL_MS,
      REVIEWS_STATS_HARD_TTL_S,
      () => this.reviewsRepository.getUserRatingStats(userId),
    );
  }

  /**
   * Retrieves a single review by its ID.
   */
  async getReviewById(id: string): Promise<Review> {
    const review = await this.reviewsRepository.findById(id);
    if (!review) {
      throw new ReviewNotFoundException();
    }
    return review;
  }

  /**
   * Automatically publishes pending reviews whose review window has elapsed.
   */
  async publishExpiredPendingReviews(): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const expiredPendingReviews =
      await this.reviewsRepository.findPendingReviewsOlderThan(cutoffDate);

    let publishedCount = 0;

    for (const review of expiredPendingReviews) {
      const session = await this.reviewsRepository.startSession();
      session.startTransaction();

      try {
        const now = new Date();
        await this.reviewsRepository.updateStatus(
          review._id.toString(),
          ReviewStatus.PUBLISHED,
          now,
          session,
        );

        await this.outboxService.saveEvent(
          RabbitMQEvent.ReviewPublished,
          {
            reviewId: review._id.toString(),
            auctionId: review.auctionId.toString(),
            reviewerId: review.reviewerId.toString(),
            reviewedUserId: review.reviewedUserId.toString(),
            overallRating: review.overallRating,
            type: review.type,
          },
          session,
        );

        // Invalidate cache for the reviewed user
        this.invalidateUserReviewsCache(review.reviewedUserId.toString());

        await session.commitTransaction();
        publishedCount++;
      } catch (err) {
        await session.abortTransaction();
        this.logger.error(
          `Failed to auto-publish expired pending review ${review._id.toString()}`,
          err,
        );
      } finally {
        await session.endSession();
      }
    }

    return publishedCount;
  }

  /**
   * Checks whether a user is eligible to submit a review for an auction.
   */
  async canUserReviewAuction(
    userId: string,
    auctionId: string,
  ): Promise<{ canReview: boolean; reason?: string }> {
    try {
      const auction = await this.auctionsService.findAuction(auctionId);

      if (auction.status !== AuctionStatus.ENDED || !auction.winnerId) {
        return {
          canReview: false,
          reason:
            'Reviews are only available for completed auctions with a winner',
        };
      }

      const sellerIdStr = auction.sellerId.toString();
      const winnerIdStr = auction.winnerId.toString();

      if (userId !== sellerIdStr && userId !== winnerIdStr) {
        return {
          canReview: false,
          reason:
            'Only the buyer or seller of this auction can submit a review',
        };
      }

      const existing = await this.reviewsRepository.findByAuctionAndReviewer(
        auctionId,
        userId,
      );

      if (existing) {
        return {
          canReview: false,
          reason: 'You have already submitted a review for this auction',
        };
      }

      const auctionEndTime = new Date(auction.endTime).getTime();
      const windowDurationMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - auctionEndTime > windowDurationMs) {
        return {
          canReview: false,
          reason: 'The 14-day review window for this auction has expired',
        };
      }

      return { canReview: true };
    } catch {
      return { canReview: false, reason: 'Auction not found' };
    }
  }

  /**
   * Admin method: Hides a review from public view (moderation / soft delete).
   */
  async hideReview(reviewId: string): Promise<Review> {
    const review = await this.reviewsRepository.findById(reviewId);
    if (!review) {
      throw new ReviewNotFoundException();
    }

    const updated = await this.reviewsRepository.updateStatus(
      reviewId,
      ReviewStatus.HIDDEN,
    );

    // Invalidate cache for the reviewed user
    this.invalidateUserReviewsCache(review.reviewedUserId.toString());

    return updated!;
  }

  /**
   * Admin method: Restores a previously hidden review to published status.
   */
  async unhideReview(reviewId: string): Promise<Review> {
    const review = await this.reviewsRepository.findById(reviewId);
    if (!review) {
      throw new ReviewNotFoundException();
    }

    const updated = await this.reviewsRepository.updateStatus(
      reviewId,
      ReviewStatus.PUBLISHED,
    );

    // Invalidate cache for the reviewed user
    this.invalidateUserReviewsCache(review.reviewedUserId.toString());

    return updated!;
  }

  /**
   * Admin method: Retrieves all reviews for an auction regardless of status.
   */
  async getAdminAuctionReviews(auctionId: string): Promise<Review[]> {
    return this.reviewsRepository.findByAuction(auctionId);
  }
}
