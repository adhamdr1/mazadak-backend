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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const graphql_redis_subscriptions_1 = require("graphql-redis-subscriptions");
const pubsub_provider_1 = require("../infrastructure/pubsub/pubsub.provider");
const events_constants_1 = require("../infrastructure/pubsub/events.constants");
const reviews_service_1 = require("./reviews.service");
const review_entity_1 = require("./entities/review.entity");
const user_rating_stats_entity_1 = require("./entities/user-rating-stats.entity");
const reviews_page_type_1 = require("./dto/reviews-page.type");
const create_review_input_1 = require("./dto/create-review.input");
const reply_review_input_1 = require("./dto/reply-review.input");
const reviews_filter_input_1 = require("./dto/reviews-filter.input");
const reviews_sort_input_1 = require("./dto/reviews-sort.input");
const review_added_payload_1 = require("./dto/review-added.payload");
const pagination_input_1 = require("../common/dto/pagination.input");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const public_profile_dto_1 = require("../users/dto/public-profile.dto");
const auction_entity_1 = require("../auctions/entities/auction.entity");
const get_user_public_profile_query_1 = require("../users/queries/get-user-public-profile.query");
const get_auction_by_id_query_1 = require("../auctions/queries/get-auction-by-id.query");
const can_review_auction_response_1 = require("./dto/can-review-auction.response");
let ReviewsResolver = class ReviewsResolver {
    reviewsService;
    queryBus;
    pubSub;
    constructor(reviewsService, queryBus, pubSub) {
        this.reviewsService = reviewsService;
        this.queryBus = queryBus;
        this.pubSub = pubSub;
    }
    async reviewer(review) {
        if (!review.reviewerId)
            return null;
        return this.queryBus.execute(new get_user_public_profile_query_1.GetUserPublicProfileQuery(review.reviewerId.toString()));
    }
    async reviewedUser(review) {
        if (!review.reviewedUserId)
            return null;
        return this.queryBus.execute(new get_user_public_profile_query_1.GetUserPublicProfileQuery(review.reviewedUserId.toString()));
    }
    async auction(review) {
        if (!review.auctionId)
            return null;
        return this.queryBus.execute(new get_auction_by_id_query_1.GetAuctionByIdQuery(review.auctionId.toString()));
    }
    async getUserReviews(userId, input, filter, sort) {
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 10;
        return this.reviewsService.getReviewsForUser(userId, filter, sort, page, limit);
    }
    async getMyWrittenReviews(currentUser, input, filter, sort) {
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 10;
        return this.reviewsService.getReviewsByReviewer(currentUser.sub, filter, sort, page, limit);
    }
    async getUserRatingStats(userId) {
        return this.reviewsService.getUserRatingStats(userId);
    }
    async canReviewAuction(currentUser, auctionId) {
        return this.reviewsService.canUserReviewAuction(currentUser.sub, auctionId);
    }
    async getReview(id) {
        return this.reviewsService.getReviewById(id);
    }
    async getAdminAuctionReviews(auctionId) {
        return this.reviewsService.getAdminAuctionReviews(auctionId);
    }
    async createReview(currentUser, input) {
        return this.reviewsService.createReview(currentUser.sub, input);
    }
    async replyToReview(currentUser, input) {
        return this.reviewsService.replyToReview(currentUser.sub, input);
    }
    async hideReview(reviewId) {
        return this.reviewsService.hideReview(reviewId);
    }
    async unhideReview(reviewId) {
        return this.reviewsService.unhideReview(reviewId);
    }
    reviewAddedToUser(_userId) {
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.REVIEW_ADDED_TO_USER);
    }
};
exports.ReviewsResolver = ReviewsResolver;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.ResolveField)(() => public_profile_dto_1.PublicProfile, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [review_entity_1.Review]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "reviewer", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.ResolveField)(() => public_profile_dto_1.PublicProfile, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [review_entity_1.Review]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "reviewedUser", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.ResolveField)(() => auction_entity_1.Auction, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [review_entity_1.Review]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "auction", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Query)(() => reviews_page_type_1.ReviewsPage, { name: 'userReviews' }),
    __param(0, (0, graphql_1.Args)('userId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('input', { nullable: true })),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __param(3, (0, graphql_1.Args)('sort', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_input_1.PaginationInput,
        reviews_filter_input_1.ReviewsFilterInput,
        reviews_sort_input_1.ReviewsSortInput]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "getUserReviews", null);
__decorate([
    (0, graphql_1.Query)(() => reviews_page_type_1.ReviewsPage, { name: 'myWrittenReviews' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input', { nullable: true })),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __param(3, (0, graphql_1.Args)('sort', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        reviews_filter_input_1.ReviewsFilterInput,
        reviews_sort_input_1.ReviewsSortInput]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "getMyWrittenReviews", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Query)(() => user_rating_stats_entity_1.UserRatingStats, { name: 'userRatingStats' }),
    __param(0, (0, graphql_1.Args)('userId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "getUserRatingStats", null);
__decorate([
    (0, graphql_1.Query)(() => can_review_auction_response_1.CanReviewAuctionResponse, { name: 'canReviewAuction' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "canReviewAuction", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Query)(() => review_entity_1.Review, { name: 'review' }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "getReview", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Query)(() => [review_entity_1.Review], { name: 'adminAuctionReviews' }),
    __param(0, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "getAdminAuctionReviews", null);
__decorate([
    (0, graphql_1.Mutation)(() => review_entity_1.Review, { name: 'createReview' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_review_input_1.CreateReviewInput]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "createReview", null);
__decorate([
    (0, graphql_1.Mutation)(() => review_entity_1.Review, { name: 'replyToReview' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reply_review_input_1.ReplyReviewInput]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "replyToReview", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Mutation)(() => review_entity_1.Review, { name: 'hideReview' }),
    __param(0, (0, graphql_1.Args)('reviewId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "hideReview", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Mutation)(() => review_entity_1.Review, { name: 'unhideReview' }),
    __param(0, (0, graphql_1.Args)('reviewId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewsResolver.prototype, "unhideReview", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Subscription)(() => review_added_payload_1.ReviewAddedPayload, {
        name: 'reviewAddedToUser',
        filter: (payload, variables) => payload.reviewAddedToUser.reviewedUserId === variables.userId,
    }),
    __param(0, (0, graphql_1.Args)('userId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReviewsResolver.prototype, "reviewAddedToUser", null);
exports.ReviewsResolver = ReviewsResolver = __decorate([
    (0, graphql_1.Resolver)(() => review_entity_1.Review),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __param(2, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService,
        cqrs_1.QueryBus,
        graphql_redis_subscriptions_1.RedisPubSub])
], ReviewsResolver);
//# sourceMappingURL=reviews.resolver.js.map