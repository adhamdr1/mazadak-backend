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
exports.BidSchema = exports.Bid = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bid_status_enum_1 = require("../enums/bid-status.enum");
let Bid = class Bid {
    _id;
    auctionId;
    bidderId;
    amount;
    status;
    createdAt;
    updatedAt;
};
exports.Bid = Bid;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Bid.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Auction', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Bid.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Bid.prototype, "bidderId", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], Bid.prototype, "amount", void 0);
__decorate([
    (0, graphql_1.Field)(() => bid_status_enum_1.BidStatus),
    (0, mongoose_1.Prop)({ type: String, enum: bid_status_enum_1.BidStatus, required: true, index: true }),
    __metadata("design:type", String)
], Bid.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Bid.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Bid.prototype, "updatedAt", void 0);
exports.Bid = Bid = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], Bid);
exports.BidSchema = mongoose_1.SchemaFactory.createForClass(Bid);
exports.BidSchema.index({ auctionId: 1, amount: -1 });
exports.BidSchema.index({ auctionId: 1, status: 1 });
//# sourceMappingURL=bid.entity.js.map