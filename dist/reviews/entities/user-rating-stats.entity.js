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
exports.UserRatingStatsSchema = exports.UserRatingStats = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const rating_breakdown_entity_1 = require("./rating-breakdown.entity");
let UserRatingStats = class UserRatingStats {
    averageRating;
    totalReviews;
    asSellerAverageRating;
    asSellerTotalReviews;
    asBuyerAverageRating;
    asBuyerTotalReviews;
    breakdown;
};
exports.UserRatingStats = UserRatingStats;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserRatingStats.prototype, "averageRating", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserRatingStats.prototype, "totalReviews", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserRatingStats.prototype, "asSellerAverageRating", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserRatingStats.prototype, "asSellerTotalReviews", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserRatingStats.prototype, "asBuyerAverageRating", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], UserRatingStats.prototype, "asBuyerTotalReviews", void 0);
__decorate([
    (0, graphql_1.Field)(() => rating_breakdown_entity_1.RatingBreakdown),
    (0, mongoose_1.Prop)({ type: rating_breakdown_entity_1.RatingBreakdownSchema, default: () => ({}) }),
    __metadata("design:type", rating_breakdown_entity_1.RatingBreakdown)
], UserRatingStats.prototype, "breakdown", void 0);
exports.UserRatingStats = UserRatingStats = __decorate([
    (0, mongoose_1.Schema)({ _id: false }),
    (0, graphql_1.ObjectType)()
], UserRatingStats);
exports.UserRatingStatsSchema = mongoose_1.SchemaFactory.createForClass(UserRatingStats);
//# sourceMappingURL=user-rating-stats.entity.js.map