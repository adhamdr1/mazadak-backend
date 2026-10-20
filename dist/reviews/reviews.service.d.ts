import type { IReviewsRepository } from './interfaces/reviews.repository.interface';
import { Review } from './entities/review.entity';
import { CreateReviewInput } from './dto/create-review.input';
import { ReplyReviewInput } from './dto/reply-review.input';
import { ReviewsFilterInput } from './dto/reviews-filter.input';
import { ReviewsSortInput } from './dto/reviews-sort.input';
import { ReviewsPage } from './dto/reviews-page.type';
import { UserRatingStats } from './entities/user-rating-stats.entity';
import { AuctionsService } from '../auctions/auctions.service';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
export declare class ReviewsService {
    private readonly reviewsRepository;
    private readonly auctionsService;
    private readonly outboxService;
    private readonly redisService;
    private readonly realtimeService;
    private readonly logger;
    constructor(reviewsRepository: IReviewsRepository, auctionsService: AuctionsService, outboxService: OutboxService, redisService: RedisService, realtimeService: RealtimeService);
    private invalidateUserReviewsCache;
    createReview(reviewerId: string, input: CreateReviewInput): Promise<Review>;
    replyToReview(replierId: string, input: ReplyReviewInput): Promise<Review>;
    getReviewsForUser(userId: string, filter?: ReviewsFilterInput, sort?: ReviewsSortInput, page?: number, limit?: number): Promise<ReviewsPage>;
    getReviewsByReviewer(reviewerId: string, filter?: ReviewsFilterInput, sort?: ReviewsSortInput, page?: number, limit?: number): Promise<ReviewsPage>;
    getUserRatingStats(userId: string): Promise<UserRatingStats>;
    getReviewById(id: string): Promise<Review>;
    publishExpiredPendingReviews(): Promise<number>;
    canUserReviewAuction(userId: string, auctionId: string): Promise<{
        canReview: boolean;
        reason?: string;
    }>;
    hideReview(reviewId: string): Promise<Review>;
    unhideReview(reviewId: string): Promise<Review>;
    getAdminAuctionReviews(auctionId: string): Promise<Review[]>;
}
