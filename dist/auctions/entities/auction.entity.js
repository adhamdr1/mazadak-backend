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
exports.AuctionSchema = exports.Auction = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auction_status_enum_1 = require("../enums/auction-status.enum");
const auction_category_enum_1 = require("../enums/auction-category.enum");
let Auction = class Auction {
    _id;
    sellerId;
    title;
    description;
    images;
    category;
    startingPrice;
    minimumBidIncrement;
    currentPrice;
    status;
    startTime;
    endTime;
    winnerId;
    isFinalized;
    adminActionReason;
    createdAt;
    updatedAt;
};
exports.Auction = Auction;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Auction.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Auction.prototype, "sellerId", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Auction.prototype, "title", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Auction.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String]),
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Auction.prototype, "images", void 0);
__decorate([
    (0, graphql_1.Field)(() => auction_category_enum_1.AuctionCategory),
    (0, mongoose_1.Prop)({ type: String, enum: auction_category_enum_1.AuctionCategory, required: true, index: true }),
    __metadata("design:type", String)
], Auction.prototype, "category", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], Auction.prototype, "startingPrice", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], Auction.prototype, "minimumBidIncrement", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], Auction.prototype, "currentPrice", void 0);
__decorate([
    (0, graphql_1.Field)(() => auction_status_enum_1.AuctionStatus),
    (0, mongoose_1.Prop)({
        type: String,
        enum: auction_status_enum_1.AuctionStatus,
        default: auction_status_enum_1.AuctionStatus.PENDING,
        index: true,
    }),
    __metadata("design:type", String)
], Auction.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], Auction.prototype, "startTime", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], Auction.prototype, "endTime", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', default: null }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Auction.prototype, "winnerId", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean),
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Auction.prototype, "isFinalized", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], Auction.prototype, "adminActionReason", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Auction.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Auction.prototype, "updatedAt", void 0);
exports.Auction = Auction = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], Auction);
exports.AuctionSchema = mongoose_1.SchemaFactory.createForClass(Auction);
exports.AuctionSchema.index({ title: 'text', description: 'text' });
//# sourceMappingURL=auction.entity.js.map