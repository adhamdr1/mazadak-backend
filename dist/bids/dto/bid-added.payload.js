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
exports.BidAddedPayload = void 0;
const graphql_1 = require("@nestjs/graphql");
const bid_entity_1 = require("../entities/bid.entity");
let BidAddedPayload = class BidAddedPayload {
    bid;
    currentPrice;
    leadingBidderId;
    bidCount;
};
exports.BidAddedPayload = BidAddedPayload;
__decorate([
    (0, graphql_1.Field)(() => bid_entity_1.Bid),
    __metadata("design:type", bid_entity_1.Bid)
], BidAddedPayload.prototype, "bid", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], BidAddedPayload.prototype, "currentPrice", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], BidAddedPayload.prototype, "leadingBidderId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], BidAddedPayload.prototype, "bidCount", void 0);
exports.BidAddedPayload = BidAddedPayload = __decorate([
    (0, graphql_1.ObjectType)()
], BidAddedPayload);
//# sourceMappingURL=bid-added.payload.js.map