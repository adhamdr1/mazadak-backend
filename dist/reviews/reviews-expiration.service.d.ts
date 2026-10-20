import Redis from 'ioredis';
import { ReviewsService } from './reviews.service';
export declare class ReviewsExpirationService {
    private readonly reviewsService;
    private readonly redis;
    private readonly logger;
    constructor(reviewsService: ReviewsService, redis: Redis);
    handleExpiredPendingReviews(): Promise<void>;
}
