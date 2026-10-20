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
exports.AutoBidsResolver = exports.BidsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const bids_service_1 = require("./bids.service");
const auto_bidding_service_1 = require("./services/auto-bidding.service");
const events_constants_1 = require("../infrastructure/pubsub/events.constants");
const bid_entity_1 = require("./entities/bid.entity");
const auto_bid_entity_1 = require("./entities/auto-bid.entity");
const auto_bid_status_enum_1 = require("./enums/auto-bid-status.enum");
const place_bid_input_1 = require("./dto/place-bid.input");
const set_auto_bid_input_1 = require("./dto/set-auto-bid.input");
const cancel_auto_bid_input_1 = require("./dto/cancel-auto-bid.input");
const bids_filter_input_1 = require("./dto/bids-filter.input");
const bids_page_type_1 = require("./dto/bids-page.type");
const auto_bids_page_type_1 = require("./dto/auto-bids-page.type");
const pagination_input_1 = require("../common/dto/pagination.input");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const bid_added_payload_1 = require("./dto/bid-added.payload");
const pubsub_provider_1 = require("../infrastructure/pubsub/pubsub.provider");
let BidsResolver = class BidsResolver {
    bidsService;
    autoBiddingService;
    pubSub;
    constructor(bidsService, autoBiddingService, pubSub) {
        this.bidsService = bidsService;
        this.autoBiddingService = autoBiddingService;
        this.pubSub = pubSub;
    }
    amount(bid) {
        const val = bid.amount;
        if (typeof val === 'string') {
            return val;
        }
        if (val && typeof val === 'object' && '$numberDecimal' in val) {
            return val.$numberDecimal;
        }
        return val?.toString?.() ?? '0.00';
    }
    async getAuctionBids(auctionId, input, filter = new bids_filter_input_1.BidsFilterInput()) {
        return this.bidsService.getAuctionBids(auctionId, input, filter);
    }
    async adminBids(input, filter = new bids_filter_input_1.BidsFilterInput()) {
        return this.bidsService.adminGetAllBids(input, filter);
    }
    async placeBid(user, input) {
        return this.bidsService.placeBid(user.sub, input);
    }
    async getMyBids(user, input, filter = new bids_filter_input_1.BidsFilterInput()) {
        return this.bidsService.getMyBids(user.sub, input, filter);
    }
    async setAutoBid(user, input) {
        return this.autoBiddingService.setAutoBid(user.sub, input);
    }
    async cancelAutoBid(user, input) {
        return this.autoBiddingService.cancelAutoBid(user.sub, input);
    }
    async getMyAutoBid(user, auctionId) {
        return this.autoBiddingService.getMyAutoBid(user.sub, auctionId);
    }
    async getMyAutoBids(user, input, status) {
        return this.autoBiddingService.getUserAutoBids(user.sub, input.page, input.limit, status);
    }
    bidAdded(_auctionId) {
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.BID_ADDED);
    }
};
exports.BidsResolver = BidsResolver;
__decorate([
    (0, graphql_1.ResolveField)(() => String, { name: 'amount' }),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bid_entity_1.Bid]),
    __metadata("design:returntype", String)
], BidsResolver.prototype, "amount", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Query)(() => bids_page_type_1.BidsPage, { name: 'auctionBids' }),
    __param(0, (0, graphql_1.Args)('auctionId')),
    __param(1, (0, graphql_1.Args)('input')),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_input_1.PaginationInput,
        bids_filter_input_1.BidsFilterInput]),
    __metadata("design:returntype", Promise)
], BidsResolver.prototype, "getAuctionBids", null);
__decorate([
    (0, graphql_1.Query)(() => bids_page_type_1.BidsPage, { name: 'adminBids' }),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        bids_filter_input_1.BidsFilterInput]),
    __metadata("design:returntype", Promise)
], BidsResolver.prototype, "adminBids", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Mutation)(() => bid_entity_1.Bid, { name: 'placeBid' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, place_bid_input_1.PlaceBidInput]),
    __metadata("design:returntype", Promise)
], BidsResolver.prototype, "placeBid", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Query)(() => bids_page_type_1.BidsPage, { name: 'myBids' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        bids_filter_input_1.BidsFilterInput]),
    __metadata("design:returntype", Promise)
], BidsResolver.prototype, "getMyBids", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Mutation)(() => auto_bid_entity_1.AutoBid, { name: 'setAutoBid' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, set_auto_bid_input_1.SetAutoBidInput]),
    __metadata("design:returntype", Promise)
], BidsResolver.prototype, "setAutoBid", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Mutation)(() => Boolean, { name: 'cancelAutoBid' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cancel_auto_bid_input_1.CancelAutoBidInput]),
    __metadata("design:returntype", Promise)
], BidsResolver.prototype, "cancelAutoBid", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Query)(() => auto_bid_entity_1.AutoBid, { name: 'myAutoBid', nullable: true }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BidsResolver.prototype, "getMyAutoBid", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, graphql_1.Query)(() => auto_bids_page_type_1.AutoBidsPage, { name: 'myAutoBids' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __param(2, (0, graphql_1.Args)('status', { type: () => auto_bid_status_enum_1.AutoBidStatus, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput, String]),
    __metadata("design:returntype", Promise)
], BidsResolver.prototype, "getMyAutoBids", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Subscription)(() => bid_added_payload_1.BidAddedPayload, {
        name: 'bidAdded',
        filter: (payload, variables) => payload.bidAdded.bid.auctionId.toString() === variables.auctionId,
    }),
    __param(0, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BidsResolver.prototype, "bidAdded", null);
exports.BidsResolver = BidsResolver = __decorate([
    (0, graphql_1.Resolver)(() => bid_entity_1.Bid),
    __param(2, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [bids_service_1.BidsService,
        auto_bidding_service_1.AutoBiddingService, Function])
], BidsResolver);
let AutoBidsResolver = class AutoBidsResolver {
    maxAmount(autoBid) {
        const val = autoBid.maxAmount;
        if (typeof val === 'string') {
            return val;
        }
        if (val && typeof val === 'object' && '$numberDecimal' in val) {
            return val.$numberDecimal;
        }
        return val?.toString?.() ?? '0.00';
    }
};
exports.AutoBidsResolver = AutoBidsResolver;
__decorate([
    (0, graphql_1.ResolveField)(() => String, { name: 'maxAmount' }),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auto_bid_entity_1.AutoBid]),
    __metadata("design:returntype", String)
], AutoBidsResolver.prototype, "maxAmount", null);
exports.AutoBidsResolver = AutoBidsResolver = __decorate([
    (0, graphql_1.Resolver)(() => auto_bid_entity_1.AutoBid)
], AutoBidsResolver);
//# sourceMappingURL=bids.resolver.js.map