import { Model, ClientSession } from 'mongoose';
import { IReviewsRepository, CreateReviewData } from '../interfaces/reviews.repository.interface';
import { Review, ReviewDocument } from '../entities/review.entity';
import { ReviewStatus } from '../enums/review-status.enum';
import { UserRatingStats } from '../entities/user-rating-stats.entity';
import { ReviewsFilterInput } from '../dto/reviews-filter.input';
import { ReviewsSortInput } from '../dto/reviews-sort.input';
export declare class MongoReviewsRepository implements IReviewsRepository {
    private readonly reviewModel;
    constructor(reviewModel: Model<ReviewDocument>);
    startSession(): Promise<ClientSession>;
    create(data: CreateReviewData, session?: ClientSession): Promise<Review>;
    findById(id: string, session?: ClientSession): Promise<Review | null>;
    findByAuctionAndReviewer(auctionId: string, reviewerId: string, session?: ClientSession): Promise<Review | null>;
    findByAuction(auctionId: string, session?: ClientSession): Promise<Review[]>;
    findUserReviews(userId: string, filter?: ReviewsFilterInput, sort?: ReviewsSortInput, page?: number, limit?: number, session?: ClientSession): Promise<{
        items: Review[];
        total: number;
    }>;
    findReviewsByReviewer(reviewerId: string, filter?: ReviewsFilterInput, sort?: ReviewsSortInput, page?: number, limit?: number, session?: ClientSession): Promise<{
        items: Review[];
        total: number;
    }>;
    addReply(reviewId: string, replyText: string, session?: ClientSession): Promise<Review | null>;
    updateStatus(reviewId: string, status: ReviewStatus, publishedAt?: Date, session?: ClientSession): Promise<Review | null>;
    getUserRatingStats(userId: string, session?: ClientSession): Promise<UserRatingStats>;
    findPendingReviewsOlderThan(thresholdDate: Date, session?: ClientSession): Promise<Review[]>;
}
