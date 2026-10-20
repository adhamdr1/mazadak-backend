import { Review } from '../entities/review.entity';
import { UserRatingStats } from '../entities/user-rating-stats.entity';
export declare class ReviewAddedPayload {
    reviewedUserId: string;
    review: Review;
    updatedRatingStats: UserRatingStats;
}
