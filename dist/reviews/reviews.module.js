"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsModule = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const mongoose_1 = require("@nestjs/mongoose");
const review_entity_1 = require("./entities/review.entity");
const reviews_resolver_1 = require("./reviews.resolver");
const reviews_service_1 = require("./reviews.service");
const mongo_reviews_repository_1 = require("./repositories/mongo.reviews.repository");
const reviews_expiration_service_1 = require("./reviews-expiration.service");
const auctions_module_1 = require("../auctions/auctions.module");
const outbox_module_1 = require("../infrastructure/outbox/outbox.module");
const get_user_rating_stats_handler_1 = require("./queries/handlers/get-user-rating-stats.handler");
let ReviewsModule = class ReviewsModule {
};
exports.ReviewsModule = ReviewsModule;
exports.ReviewsModule = ReviewsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cqrs_1.CqrsModule,
            mongoose_1.MongooseModule.forFeature([{ name: review_entity_1.Review.name, schema: review_entity_1.ReviewSchema }]),
            auctions_module_1.AuctionsModule,
            outbox_module_1.OutboxModule,
        ],
        providers: [
            reviews_resolver_1.ReviewsResolver,
            reviews_service_1.ReviewsService,
            reviews_expiration_service_1.ReviewsExpirationService,
            get_user_rating_stats_handler_1.GetUserRatingStatsHandler,
            {
                provide: 'IReviewsRepository',
                useClass: mongo_reviews_repository_1.MongoReviewsRepository,
            },
        ],
        exports: [reviews_service_1.ReviewsService, 'IReviewsRepository'],
    })
], ReviewsModule);
//# sourceMappingURL=reviews.module.js.map