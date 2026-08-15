import { ClientSession, Types } from 'mongoose';
import { Review } from '../entities/review.entity';
import { ReviewStatus } from '../enums/review-status.enum';
import { ReviewType } from '../enums/review-type.enum';
import { UserRatingStats } from '../entities/user-rating-stats.entity';
import { ReviewsFilterInput } from '../dto/reviews-filter.input';
import { ReviewsSortInput } from '../dto/reviews-sort.input';

export interface CreateReviewData {
  auctionId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  reviewedUserId: Types.ObjectId;
  type: ReviewType;
  status: ReviewStatus;
  overallRating: number;
  criteria?: {
    accuracy?: number;
    communication?: number;
    deliverySpeed?: number;
    itemAsDescribed?: number;
    paymentPromptness?: number;
  };
  comment?: string;
  publishedAt?: Date;
}

export interface IReviewsRepository {
  startSession(): Promise<ClientSession>;

  create(data: CreateReviewData, session?: ClientSession): Promise<Review>;

  findById(id: string, session?: ClientSession): Promise<Review | null>;

  findByAuctionAndReviewer(
    auctionId: string,
    reviewerId: string,
    session?: ClientSession,
  ): Promise<Review | null>;

  findByAuction(auctionId: string, session?: ClientSession): Promise<Review[]>;

  findUserReviews(
    userId: string,
    filter?: ReviewsFilterInput,
    sort?: ReviewsSortInput,
    page?: number,
    limit?: number,
    session?: ClientSession,
  ): Promise<{ items: Review[]; total: number }>;

  findReviewsByReviewer(
    reviewerId: string,
    page?: number,
    limit?: number,
    session?: ClientSession,
  ): Promise<{ items: Review[]; total: number }>;

  addReply(
    reviewId: string,
    replyText: string,
    session?: ClientSession,
  ): Promise<Review | null>;

  updateStatus(
    reviewId: string,
    status: ReviewStatus,
    publishedAt?: Date,
    session?: ClientSession,
  ): Promise<Review | null>;

  getUserRatingStats(
    userId: string,
    session?: ClientSession,
  ): Promise<UserRatingStats>;

  findPendingReviewsOlderThan(
    thresholdDate: Date,
    session?: ClientSession,
  ): Promise<Review[]>;
}
