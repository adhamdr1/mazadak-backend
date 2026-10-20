import { QueryBus } from '@nestjs/cqrs';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { UserRatingStats } from './entities/user-rating-stats.entity';
import { ReviewsPage } from './dto/reviews-page.type';
import { CreateReviewInput } from './dto/create-review.input';
import { ReplyReviewInput } from './dto/reply-review.input';
import { ReviewsFilterInput } from './dto/reviews-filter.input';
import { ReviewsSortInput } from './dto/reviews-sort.input';
import { ReviewAddedPayload } from './dto/review-added.payload';
import { PaginationInput } from '../common/dto/pagination.input';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PublicProfile } from '../users/dto/public-profile.dto';
import { Auction } from '../auctions/entities/auction.entity';
import { CanReviewAuctionResponse } from './dto/can-review-auction.response';
export declare class ReviewsResolver {
    private readonly reviewsService;
    private readonly queryBus;
    private readonly pubSub;
    constructor(reviewsService: ReviewsService, queryBus: QueryBus, pubSub: RedisPubSub);
    reviewer(review: Review): Promise<PublicProfile | null>;
    reviewedUser(review: Review): Promise<PublicProfile | null>;
    auction(review: Review): Promise<Auction | null>;
    getUserReviews(userId: string, input?: PaginationInput, filter?: ReviewsFilterInput, sort?: ReviewsSortInput): Promise<ReviewsPage>;
    getMyWrittenReviews(currentUser: JwtPayload, input?: PaginationInput, filter?: ReviewsFilterInput, sort?: ReviewsSortInput): Promise<ReviewsPage>;
    getUserRatingStats(userId: string): Promise<UserRatingStats>;
    canReviewAuction(currentUser: JwtPayload, auctionId: string): Promise<CanReviewAuctionResponse>;
    getReview(id: string): Promise<Review>;
    getAdminAuctionReviews(auctionId: string): Promise<Review[]>;
    createReview(currentUser: JwtPayload, input: CreateReviewInput): Promise<Review>;
    replyToReview(currentUser: JwtPayload, input: ReplyReviewInput): Promise<Review>;
    hideReview(reviewId: string): Promise<Review>;
    unhideReview(reviewId: string): Promise<Review>;
    reviewAddedToUser(_userId: string): AsyncIterable<{
        reviewAddedToUser: ReviewAddedPayload;
    }>;
}
