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
exports.AutoBidSchema = exports.AutoBid = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auto_bid_status_enum_1 = require("../enums/auto-bid-status.enum");
let AutoBid = class AutoBid {
    _id;
    auctionId;
    userId;
    maxAmount;
    status;
    createdAt;
    updatedAt;
};
exports.AutoBid = AutoBid;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], AutoBid.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Auction', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], AutoBid.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], AutoBid.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], AutoBid.prototype, "maxAmount", void 0);
__decorate([
    (0, graphql_1.Field)(() => auto_bid_status_enum_1.AutoBidStatus),
    (0, mongoose_1.Prop)({
        type: String,
        enum: auto_bid_status_enum_1.AutoBidStatus,
        default: auto_bid_status_enum_1.AutoBidStatus.ACTIVE,
        required: true,
        index: true,
    }),
    __metadata("design:type", String)
], AutoBid.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], AutoBid.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], AutoBid.prototype, "updatedAt", void 0);
exports.AutoBid = AutoBid = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], AutoBid);
exports.AutoBidSchema = mongoose_1.SchemaFactory.createForClass(AutoBid);
exports.AutoBidSchema.index({ auctionId: 1, userId: 1 }, { unique: true });
exports.AutoBidSchema.index({ auctionId: 1, status: 1, maxAmount: -1, createdAt: 1 });
//# sourceMappingURL=auto-bid.entity.js.map