"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const review_status_enum_1 = require("./enums/review-status.enum");
const review_type_enum_1 = require("./enums/review-type.enum");
const auctions_service_1 = require("../auctions/auctions.service");
const auction_status_enum_1 = require("../auctions/enums/auction-status.enum");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const redis_service_1 = require("../infrastructure/redis/redis.service");
const realtime_service_1 = require("../infrastructure/pubsub/realtime.service");
const exceptions_1 = require("./exceptions");
const REVIEW_WINDOW_DAYS = 14;
const REVIEWS_USER_SOFT_TTL_MS = 60 * 1000;
const REVIEWS_USER_HARD_TTL_S = 10 * 60;
const REVIEWS_STATS_SOFT_TTL_MS = 5 * 60 * 1000;
const REVIEWS_STATS_HARD_TTL_S = 60 * 60;
let ReviewsService = ReviewsService_1 = class ReviewsService {
    reviewsRepository;
    auctionsService;
    outboxService;
    redisService;
    realtimeService;
    logger = new common_1.Logger(ReviewsService_1.name);
    constructor(reviewsRepository, auctionsService, outboxService, redisService, realtimeService) {
        this.reviewsRepository = reviewsRepository;
        this.auctionsService = auctionsService;
        this.outboxService = outboxService;
        this.redisService = redisService;
        this.realtimeService = realtimeService;
    }
    invalidateUserReviewsCache(userId) {
        void this.redisService.invalidatePattern(`reviews:user:${userId}:*`);
        void this.redisService.invalidatePattern(`reviews:stats:${userId}`);
    }
    async createReview(reviewerId, input) {
        const session = await this.reviewsRepository.startSession();
        session.startTransaction();
        let createdReview;
        let counterpartReview;
        let bothPublished = false;
        let reviewedUserId;
        try {
            const auction = await this.auctionsService.findAuction(input.auctionId);
            if (auction.status !== auction_status_enum_1.AuctionStatus.ENDED || !auction.winnerId) {
                throw new exceptions_1.AuctionNotEligibleForReviewException();
            }
            const sellerIdStr = auction.sellerId.toString();
            const winnerIdStr = auction.winnerId.toString();
            if (sellerIdStr === winnerIdStr) {
                throw new exceptions_1.ReviewSelfRatingException();
            }
            let type;
            if (reviewerId === winnerIdStr) {
                type = review_type_enum_1.ReviewType.BUYER_TO_SELLER;
                reviewedUserId = auction.sellerId;
            }
            else if (reviewerId === sellerIdStr) {
                type = review_type_enum_1.ReviewType.SELLER_TO_BUYER;
                reviewedUserId = auction.winnerId;
            }
            else {
                throw new exceptions_1.NotAuctionParticipantException();
            }
            const auctionEndTime = new Date(auction.endTime).getTime();
            const windowDurationMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
            if (Date.now() - auctionEndTime > windowDurationMs) {
                throw new exceptions_1.ReviewWindowExpiredException();
            }
            const existingReview = await this.reviewsRepository.findByAuctionAndReviewer(input.auctionId, reviewerId, session);
            if (existingReview) {
                throw new exceptions_1.ReviewAlreadyExistsException();
            }
            const allAuctionReviews = await this.reviewsRepository.findByAuction(input.auctionId, session);
            counterpartReview = allAuctionReviews.find((r) => r.reviewerId.toString() === reviewedUserId.toString());
            if (counterpartReview &&
                counterpartReview.status === review_status_enum_1.ReviewStatus.PENDING) {
                const now = new Date();
                bothPublished = true;
                createdReview = await this.reviewsRepository.create({
                    auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                    reviewerId: new mongoose_1.Types.ObjectId(reviewerId),
                    reviewedUserId,
                    type,
                    status: review_status_enum_1.ReviewStatus.PUBLISHED,
                    overallRating: input.overallRating,
                    criteria: input.criteria,
                    comment: input.comment,
                    publishedAt: now,
                }, session);
                await this.reviewsRepository.updateStatus(counterpartReview._id.toString(), review_status_enum_1.ReviewStatus.PUBLISHED, now, session);
                await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.ReviewPublished, {
                    reviewId: createdReview._id.toString(),
                    auctionId: input.auctionId,
                    reviewerId,
                    reviewedUserId: reviewedUserId.toString(),
                    overallRating: createdReview.overallRating,
                    type: createdReview.type,
                }, session);
                await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.ReviewPublished, {
                    reviewId: counterpartReview._id.toString(),
                    auctionId: input.auctionId,
                    reviewerId: counterpartReview.reviewerId.toString(),
                    reviewedUserId: counterpartReview.reviewedUserId.toString(),
                    overallRating: counterpartReview.overallRating,
                    type: counterpartReview.type,
                }, session);
            }
            else {
                createdReview = await this.reviewsRepository.create({
                    auctionId: new mongoose_1.Types.ObjectId(input.auctionId),
                    reviewerId: new mongoose_1.Types.ObjectId(reviewerId),
                    reviewedUserId,
                    type,
                    status: review_status_enum_1.ReviewStatus.PENDING,
                    overallRating: input.overallRating,
                    criteria: input.criteria,
                    comment: input.comment,
                }, session);
                await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.ReviewCreated, {
                    reviewId: createdReview._id.toString(),
                    auctionId: input.auctionId,
                    reviewerId,
                    reviewedUserId: reviewedUserId.toString(),
                    type: createdReview.type,
                    status: createdReview.status,
                }, session);
            }
            await session.commitTransaction();
        }
        catch (error) {
            await session.abortTransaction();
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 11000) {
                throw new exceptions_1.ReviewAlreadyExistsException();
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
        if (bothPublished && counterpartReview) {
            this.invalidateUserReviewsCache(reviewedUserId.toString());
            this.invalidateUserReviewsCache(reviewerId);
            const [statsForReviewedUser, statsForReviewer] = await Promise.all([
                this.getUserRatingStats(reviewedUserId.toString()),
                this.getUserRatingStats(reviewerId),
            ]);
            await Promise.all([
                this.realtimeService.publishReviewAddedToUser({
                    reviewedUserId: reviewedUserId.toString(),
                    review: createdReview,
                    updatedRatingStats: statsForReviewedUser,
                }),
                this.realtimeService.publishReviewAddedToUser({
                    reviewedUserId: reviewerId,
                    review: counterpartReview,
                    updatedRatingStats: statsForReviewer,
                }),
            ]);
        }
        return createdReview;
    }
    async replyToReview(replierId, input) {
        const session = await this.reviewsRepository.startSession();
        session.startTransaction();
        try {
            const review = await this.reviewsRepository.findById(input.reviewId, session);
            if (!review) {
                throw new exceptions_1.ReviewNotFoundException();
            }
            if (review.reviewedUserId.toString() !== replierId) {
                throw new exceptions_1.ReviewReplyForbiddenException('Only the reviewed user can reply to this review');
            }
            if (review.status !== review_status_enum_1.ReviewStatus.PUBLISHED) {
                throw new exceptions_1.ReviewReplyForbiddenException('Cannot reply to a review that is not yet published');
            }
            if (review.reply) {
                throw new exceptions_1.ReviewReplyAlreadyExistsException();
            }
            const updatedReview = await this.reviewsRepository.addReply(input.reviewId, input.reply, session);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.ReviewReplied, {
                reviewId: input.reviewId,
                auctionId: review.auctionId.toString(),
                reviewerId: review.reviewerId.toString(),
                replierId,
            }, session);
            this.invalidateUserReviewsCache(review.reviewedUserId.toString());
            await session.commitTransaction();
            return updatedReview;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async getReviewsForUser(userId, filter, sort, page = 1, limit = 10) {
        const cacheKey = `reviews:user:${userId}` +
            `:t:${filter?.type ?? 'all'}` +
            `:r:${filter?.minRating ?? 'all'}` +
            `:s:${sort?.field ?? 'created'}:${sort?.order ?? 'desc'}` +
            `:p:${page}:l:${limit}`;
        return this.redisService.getOrSetSWR(cacheKey, REVIEWS_USER_SOFT_TTL_MS, REVIEWS_USER_HARD_TTL_S, async () => {
            const { items, total } = await this.reviewsRepository.findUserReviews(userId, filter, sort, page, limit);
            const totalPages = Math.ceil(total / limit) || 1;
            const hasNextPage = page < totalPages;
            return {
                items,
                total,
                totalPages,
                hasNextPage,
            };
        });
    }
    async getReviewsByReviewer(reviewerId, filter, sort, page = 1, limit = 10) {
        const { items, total } = await this.reviewsRepository.findReviewsByReviewer(reviewerId, filter, sort, page, limit);
        const totalPages = Math.ceil(total / limit) || 1;
        const hasNextPage = page < totalPages;
        return {
            items,
            total,
            totalPages,
            hasNextPage,
        };
    }
    async getUserRatingStats(userId) {
        const cacheKey = `reviews:stats:${userId}`;
        return this.redisService.getOrSetSWR(cacheKey, REVIEWS_STATS_SOFT_TTL_MS, REVIEWS_STATS_HARD_TTL_S, () => this.reviewsRepository.getUserRatingStats(userId));
    }
    async getReviewById(id) {
        const review = await this.reviewsRepository.findById(id);
        if (!review) {
            throw new exceptions_1.ReviewNotFoundException();
        }
        return review;
    }
    async publishExpiredPendingReviews() {
        const cutoffDate = new Date(Date.now() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const expiredPendingReviews = await this.reviewsRepository.findPendingReviewsOlderThan(cutoffDate);
        let publishedCount = 0;
        for (const review of expiredPendingReviews) {
            const session = await this.reviewsRepository.startSession();
            session.startTransaction();
            let successfullyCommitted = false;
            try {
                const now = new Date();
                await this.reviewsRepository.updateStatus(review._id.toString(), review_status_enum_1.ReviewStatus.PUBLISHED, now, session);
                await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.ReviewPublished, {
                    reviewId: review._id.toString(),
                    auctionId: review.auctionId.toString(),
                    reviewerId: review.reviewerId.toString(),
                    reviewedUserId: review.reviewedUserId.toString(),
                    overallRating: review.overallRating,
                    type: review.type,
                }, session);
                await session.commitTransaction();
                successfullyCommitted = true;
                publishedCount++;
            }
            catch (err) {
                await session.abortTransaction();
                this.logger.error(`Failed to auto-publish expired pending review ${review._id.toString()}`, err);
            }
            finally {
                await session.endSession();
            }
            if (successfullyCommitted) {
                this.invalidateUserReviewsCache(review.reviewedUserId.toString());
                const updatedStats = await this.getUserRatingStats(review.reviewedUserId.toString());
                await this.realtimeService.publishReviewAddedToUser({
                    reviewedUserId: review.reviewedUserId.toString(),
                    review,
                    updatedRatingStats: updatedStats,
                });
            }
        }
        return publishedCount;
    }
    async canUserReviewAuction(userId, auctionId) {
        try {
            const auction = await this.auctionsService.findAuction(auctionId);
            if (auction.status !== auction_status_enum_1.AuctionStatus.ENDED || !auction.winnerId) {
                return {
                    canReview: false,
                    reason: 'Reviews are only available for completed auctions with a winner',
                };
            }
            const sellerIdStr = auction.sellerId.toString();
            const winnerIdStr = auction.winnerId.toString();
            if (sellerIdStr === winnerIdStr) {
                return {
                    canReview: false,
                    reason: 'You cannot review yourself',
                };
            }
            if (userId !== sellerIdStr && userId !== winnerIdStr) {
                return {
                    canReview: false,
                    reason: 'Only the buyer or seller of this auction can submit a review',
                };
            }
            const existing = await this.reviewsRepository.findByAuctionAndReviewer(auctionId, userId);
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
        }
        catch {
            return { canReview: false, reason: 'Auction not found' };
        }
    }
    async hideReview(reviewId) {
        const review = await this.reviewsRepository.findById(reviewId);
        if (!review) {
            throw new exceptions_1.ReviewNotFoundException();
        }
        const updated = await this.reviewsRepository.updateStatus(reviewId, review_status_enum_1.ReviewStatus.HIDDEN);
        this.invalidateUserReviewsCache(review.reviewedUserId.toString());
        return updated;
    }
    async unhideReview(reviewId) {
        const review = await this.reviewsRepository.findById(reviewId);
        if (!review) {
            throw new exceptions_1.ReviewNotFoundException();
        }
        const updated = await this.reviewsRepository.updateStatus(reviewId, review_status_enum_1.ReviewStatus.PUBLISHED);
        this.invalidateUserReviewsCache(review.reviewedUserId.toString());
        return updated;
    }
    async getAdminAuctionReviews(auctionId) {
        return this.reviewsRepository.findByAuction(auctionId);
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = ReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IReviewsRepository')),
    __metadata("design:paramtypes", [Object, auctions_service_1.AuctionsService,
        outbox_service_1.OutboxService,
        redis_service_1.RedisService,
        realtime_service_1.RealtimeService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map