import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  IReviewsRepository,
  CreateReviewData,
} from '../interfaces/reviews.repository.interface';
import { Review, ReviewDocument } from '../entities/review.entity';
import { ReviewStatus } from '../enums/review-status.enum';
import { ReviewType } from '../enums/review-type.enum';
import { UserRatingStats } from '../entities/user-rating-stats.entity';
import { ReviewsFilterInput } from '../dto/reviews-filter.input';
import { ReviewsSortInput } from '../dto/reviews-sort.input';
import { ReviewsSortField } from '../enums/reviews-sort-field.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';

interface RatingAggregationResult {
  _id: null;
  totalReviews: number;
  averageRating: number;
  asSellerTotalReviews: number;
  asSellerRatingSum: number;
  asBuyerTotalReviews: number;
  asBuyerRatingSum: number;
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
}

@Injectable()
export class MongoReviewsRepository implements IReviewsRepository {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return this.reviewModel.db.startSession();
  }

  async create(
    data: CreateReviewData,
    session?: ClientSession,
  ): Promise<Review> {
    const review = new this.reviewModel(data);
    return await review.save({ session });
  }

  async findById(id: string, session?: ClientSession): Promise<Review | null> {
    return await this.reviewModel
      .findById(new Types.ObjectId(id))
      .session(session || null)
      .exec();
  }

  async findByAuctionAndReviewer(
    auctionId: string,
    reviewerId: string,
    session?: ClientSession,
  ): Promise<Review | null> {
    return await this.reviewModel
      .findOne({
        auctionId: new Types.ObjectId(auctionId),
        reviewerId: new Types.ObjectId(reviewerId),
      })
      .session(session || null)
      .exec();
  }

  async findByAuction(
    auctionId: string,
    session?: ClientSession,
  ): Promise<Review[]> {
    return await this.reviewModel
      .find({
        auctionId: new Types.ObjectId(auctionId),
      })
      .session(session || null)
      .exec();
  }

  async findUserReviews(
    userId: string,
    filter?: ReviewsFilterInput,
    sort?: ReviewsSortInput,
    page = 1,
    limit = 10,
    session?: ClientSession,
  ): Promise<{ items: Review[]; total: number }> {
    const query: Record<string, unknown> = {
      reviewedUserId: new Types.ObjectId(userId),
      status: ReviewStatus.PUBLISHED,
    };

    if (filter?.type) {
      query.type = filter.type;
    }

    if (filter?.minRating) {
      query.overallRating = { $gte: filter.minRating };
    }

    const sortOptions: Record<string, 1 | -1> = {};
    const direction: 1 | -1 = sort?.order === SortOrder.ASC ? 1 : -1;

    if (sort?.field === ReviewsSortField.RATING) {
      sortOptions.overallRating = direction;
      sortOptions.createdAt = -1;
    } else {
      sortOptions.createdAt = direction;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .session(session || null)
        .exec(),
      this.reviewModel
        .countDocuments(query)
        .session(session || null)
        .exec(),
    ]);

    return { items, total };
  }

  async findReviewsByReviewer(
    reviewerId: string,
    page = 1,
    limit = 10,
    session?: ClientSession,
  ): Promise<{ items: Review[]; total: number }> {
    const query: Record<string, unknown> = {
      reviewerId: new Types.ObjectId(reviewerId),
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session || null)
        .exec(),
      this.reviewModel
        .countDocuments(query)
        .session(session || null)
        .exec(),
    ]);

    return { items, total };
  }

  async addReply(
    reviewId: string,
    replyText: string,
    session?: ClientSession,
  ): Promise<Review | null> {
    return await this.reviewModel
      .findByIdAndUpdate(
        new Types.ObjectId(reviewId),
        {
          $set: {
            reply: replyText,
            repliedAt: new Date(),
          },
        },
        { returnDocument: 'after', session: session || null },
      )
      .exec();
  }

  async updateStatus(
    reviewId: string,
    status: ReviewStatus,
    publishedAt?: Date,
    session?: ClientSession,
  ): Promise<Review | null> {
    const updatePayload: Record<string, unknown> = { status };
    if (publishedAt) {
      updatePayload.publishedAt = publishedAt;
    }

    return await this.reviewModel
      .findByIdAndUpdate(
        new Types.ObjectId(reviewId),
        { $set: updatePayload },
        { returnDocument: 'after', session: session || null },
      )
      .exec();
  }

  async getUserRatingStats(
    userId: string,
    session?: ClientSession,
  ): Promise<UserRatingStats> {
    const aggregation = this.reviewModel.aggregate<RatingAggregationResult>([
      {
        $match: {
          reviewedUserId: new Types.ObjectId(userId),
          status: ReviewStatus.PUBLISHED,
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$overallRating' },
          asSellerTotalReviews: {
            $sum: {
              $cond: [{ $eq: ['$type', ReviewType.BUYER_TO_SELLER] }, 1, 0],
            },
          },
          asSellerRatingSum: {
            $sum: {
              $cond: [
                { $eq: ['$type', ReviewType.BUYER_TO_SELLER] },
                '$overallRating',
                0,
              ],
            },
          },
          asBuyerTotalReviews: {
            $sum: {
              $cond: [{ $eq: ['$type', ReviewType.SELLER_TO_BUYER] }, 1, 0],
            },
          },
          asBuyerRatingSum: {
            $sum: {
              $cond: [
                { $eq: ['$type', ReviewType.SELLER_TO_BUYER] },
                '$overallRating',
                0,
              ],
            },
          },
          oneStar: {
            $sum: { $cond: [{ $eq: ['$overallRating', 1] }, 1, 0] },
          },
          twoStar: {
            $sum: { $cond: [{ $eq: ['$overallRating', 2] }, 1, 0] },
          },
          threeStar: {
            $sum: { $cond: [{ $eq: ['$overallRating', 3] }, 1, 0] },
          },
          fourStar: {
            $sum: { $cond: [{ $eq: ['$overallRating', 4] }, 1, 0] },
          },
          fiveStar: {
            $sum: { $cond: [{ $eq: ['$overallRating', 5] }, 1, 0] },
          },
        },
      },
    ]);

    if (session) {
      aggregation.session(session);
    }

    const results = await aggregation.exec();
    const result = results[0];

    if (!result || result.totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        asSellerAverageRating: 0,
        asSellerTotalReviews: 0,
        asBuyerAverageRating: 0,
        asBuyerTotalReviews: 0,
        breakdown: {
          oneStar: 0,
          twoStar: 0,
          threeStar: 0,
          fourStar: 0,
          fiveStar: 0,
        },
      };
    }

    const asSellerAverage =
      result.asSellerTotalReviews > 0
        ? Math.round(
            (result.asSellerRatingSum / result.asSellerTotalReviews) * 10,
          ) / 10
        : 0;

    const asBuyerAverage =
      result.asBuyerTotalReviews > 0
        ? Math.round(
            (result.asBuyerRatingSum / result.asBuyerTotalReviews) * 10,
          ) / 10
        : 0;

    return {
      averageRating: Math.round(result.averageRating * 10) / 10,
      totalReviews: result.totalReviews,
      asSellerAverageRating: asSellerAverage,
      asSellerTotalReviews: result.asSellerTotalReviews,
      asBuyerAverageRating: asBuyerAverage,
      asBuyerTotalReviews: result.asBuyerTotalReviews,
      breakdown: {
        oneStar: result.oneStar,
        twoStar: result.twoStar,
        threeStar: result.threeStar,
        fourStar: result.fourStar,
        fiveStar: result.fiveStar,
      },
    };
  }

  async findPendingReviewsOlderThan(
    thresholdDate: Date,
    session?: ClientSession,
  ): Promise<Review[]> {
    return await this.reviewModel
      .find({
        status: ReviewStatus.PENDING,
        createdAt: { $lte: thresholdDate },
      })
      .session(session || null)
      .exec();
  }
}
