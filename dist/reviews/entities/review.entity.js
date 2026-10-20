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
exports.ReviewSchema = exports.Review = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const review_type_enum_1 = require("../enums/review-type.enum");
const review_status_enum_1 = require("../enums/review-status.enum");
const review_criteria_entity_1 = require("./review-criteria.entity");
let Review = class Review {
    _id;
    auctionId;
    reviewerId;
    reviewedUserId;
    type;
    status;
    overallRating;
    criteria;
    comment;
    reply;
    repliedAt;
    publishedAt;
    createdAt;
    updatedAt;
};
exports.Review = Review;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Review.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Auction', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Review.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Review.prototype, "reviewerId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Review.prototype, "reviewedUserId", void 0);
__decorate([
    (0, graphql_1.Field)(() => review_type_enum_1.ReviewType),
    (0, mongoose_1.Prop)({ type: String, enum: review_type_enum_1.ReviewType, required: true }),
    __metadata("design:type", String)
], Review.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)(() => review_status_enum_1.ReviewStatus),
    (0, mongoose_1.Prop)({
        type: String,
        enum: review_status_enum_1.ReviewStatus,
        default: review_status_enum_1.ReviewStatus.PENDING,
    }),
    __metadata("design:type", String)
], Review.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, mongoose_1.Prop)({ type: Number, required: true, min: 1, max: 5 }),
    __metadata("design:type", Number)
], Review.prototype, "overallRating", void 0);
__decorate([
    (0, graphql_1.Field)(() => review_criteria_entity_1.ReviewCriteria, { nullable: true }),
    (0, mongoose_1.Prop)({ type: review_criteria_entity_1.ReviewCriteriaSchema, required: false }),
    __metadata("design:type", review_criteria_entity_1.ReviewCriteria)
], Review.prototype, "criteria", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: String, maxlength: 500, trim: true, required: false }),
    __metadata("design:type", String)
], Review.prototype, "comment", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: String, maxlength: 300, trim: true, required: false }),
    __metadata("design:type", String)
], Review.prototype, "reply", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: Date, required: false }),
    __metadata("design:type", Date)
], Review.prototype, "repliedAt", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: Date, required: false }),
    __metadata("design:type", Date)
], Review.prototype, "publishedAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date),
    __metadata("design:type", Date)
], Review.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date),
    __metadata("design:type", Date)
], Review.prototype, "updatedAt", void 0);
exports.Review = Review = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        collection: 'reviews',
    })
], Review);
exports.ReviewSchema = mongoose_1.SchemaFactory.createForClass(Review);
exports.ReviewSchema.index({ reviewedUserId: 1, status: 1, createdAt: -1 });
exports.ReviewSchema.index({ reviewedUserId: 1, status: 1, overallRating: -1 });
exports.ReviewSchema.index({ reviewerId: 1, createdAt: -1 });
exports.ReviewSchema.index({ auctionId: 1, reviewerId: 1 }, { unique: true });
exports.ReviewSchema.index({ status: 1, createdAt: 1 });
//# sourceMappingURL=review.entity.js.map