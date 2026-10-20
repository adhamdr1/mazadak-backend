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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserRatingStatsHandler = void 0;
const cqrs_1 = require("@nestjs/cqrs");
const get_user_rating_stats_query_1 = require("../get-user-rating-stats.query");
const reviews_service_1 = require("../../reviews.service");
let GetUserRatingStatsHandler = class GetUserRatingStatsHandler {
    reviewsService;
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    async execute(query) {
        return this.reviewsService.getUserRatingStats(query.userId);
    }
};
exports.GetUserRatingStatsHandler = GetUserRatingStatsHandler;
exports.GetUserRatingStatsHandler = GetUserRatingStatsHandler = __decorate([
    (0, cqrs_1.QueryHandler)(get_user_rating_stats_query_1.GetUserRatingStatsQuery),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], GetUserRatingStatsHandler);
//# sourceMappingURL=get-user-rating-stats.handler.js.map