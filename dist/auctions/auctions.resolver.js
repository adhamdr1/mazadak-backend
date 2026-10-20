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
exports.AuctionsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const auctions_service_1 = require("./auctions.service");
const events_constants_1 = require("../infrastructure/pubsub/events.constants");
const auction_entity_1 = require("./entities/auction.entity");
const create_auction_input_1 = require("./dto/create-auction.input");
const update_auction_input_1 = require("./dto/update-auction.input");
const auctions_filter_input_1 = require("./dto/auctions-filter.input");
const auctions_page_type_1 = require("./dto/auctions-page.type");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const pagination_input_1 = require("../common/dto/pagination.input");
const auction_status_changed_payload_1 = require("./dto/auction-status-changed.payload");
const pubsub_provider_1 = require("../infrastructure/pubsub/pubsub.provider");
let AuctionsResolver = class AuctionsResolver {
    auctionsService;
    pubSub;
    constructor(auctionsService, pubSub) {
        this.auctionsService = auctionsService;
        this.pubSub = pubSub;
    }
    async getAuctions(input, filter = new auctions_filter_input_1.AuctionsFilterInput()) {
        return this.auctionsService.findAuctions(input, filter);
    }
    async adminAuctions(input, filter = new auctions_filter_input_1.AuctionsFilterInput()) {
        return this.auctionsService.findAllForAdmin(input, filter);
    }
    async getAuction(id) {
        return this.auctionsService.findAuction(id);
    }
    async getMyAuctions(currentUser, input, filter = new auctions_filter_input_1.AuctionsFilterInput()) {
        return this.auctionsService.findMyAuctions(currentUser.sub, input, filter);
    }
    async getMyWonAuctions(currentUser, input, filter = new auctions_filter_input_1.AuctionsFilterInput()) {
        return this.auctionsService.findWonAuctions(currentUser.sub, input, filter);
    }
    async getUserAuctions(userId, input, filter = new auctions_filter_input_1.AuctionsFilterInput()) {
        const pageInput = input ?? { page: 1, limit: 10 };
        return this.auctionsService.findMyAuctions(userId, pageInput, filter);
    }
    async createAuction(currentUser, input) {
        return this.auctionsService.createAuction(currentUser.sub, input);
    }
    async updateAuction(currentUser, id, input) {
        return this.auctionsService.updateAuction(id, currentUser.sub, input);
    }
    async cancelAuction(currentUser, id) {
        return this.auctionsService.cancelAuction(id, currentUser.sub, currentUser.role);
    }
    auctionCreated() {
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.AUCTION_CREATED);
    }
    auctionStatusChanged(_id) {
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.AUCTION_STATUS_CHANGED);
    }
};
exports.AuctionsResolver = AuctionsResolver;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Query)(() => auctions_page_type_1.AuctionsPage, { name: 'auctions' }),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        auctions_filter_input_1.AuctionsFilterInput]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "getAuctions", null);
__decorate([
    (0, graphql_1.Query)(() => auctions_page_type_1.AuctionsPage, { name: 'adminAuctions' }),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        auctions_filter_input_1.AuctionsFilterInput]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "adminAuctions", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Query)(() => auction_entity_1.Auction, { name: 'auction' }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "getAuction", null);
__decorate([
    (0, graphql_1.Query)(() => auctions_page_type_1.AuctionsPage, { name: 'myAuctions' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        auctions_filter_input_1.AuctionsFilterInput]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "getMyAuctions", null);
__decorate([
    (0, graphql_1.Query)(() => auctions_page_type_1.AuctionsPage, { name: 'myWonAuctions' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        auctions_filter_input_1.AuctionsFilterInput]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "getMyWonAuctions", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Query)(() => auctions_page_type_1.AuctionsPage, { name: 'userAuctions' }),
    __param(0, (0, graphql_1.Args)('userId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('input', { nullable: true })),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_input_1.PaginationInput,
        auctions_filter_input_1.AuctionsFilterInput]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "getUserAuctions", null);
__decorate([
    (0, graphql_1.Mutation)(() => auction_entity_1.Auction),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_auction_input_1.CreateAuctionInput]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "createAuction", null);
__decorate([
    (0, graphql_1.Mutation)(() => auction_entity_1.Auction),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(2, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_auction_input_1.UpdateAuctionInput]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "updateAuction", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuctionsResolver.prototype, "cancelAuction", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Subscription)(() => auction_entity_1.Auction, {
        name: 'auctionCreated',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuctionsResolver.prototype, "auctionCreated", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, graphql_1.Subscription)(() => auction_status_changed_payload_1.AuctionStatusChangedPayload, {
        name: 'auctionStatusChanged',
        filter: (payload, variables) => {
            const auction = payload.auctionStatusChanged?.auction ||
                payload.auction;
            if (!auction)
                return false;
            if (!variables?.auctionId)
                return true;
            const targetId = auction._id?.toString() || auction.id?.toString();
            return targetId === variables.auctionId;
        },
        resolve: (payload) => {
            if (payload.auctionStatusChanged?.auction) {
                return payload.auctionStatusChanged;
            }
            if (payload.auction) {
                return { auction: payload.auction };
            }
            return payload;
        },
    }),
    __param(0, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuctionsResolver.prototype, "auctionStatusChanged", null);
exports.AuctionsResolver = AuctionsResolver = __decorate([
    (0, graphql_1.Resolver)(() => auction_entity_1.Auction),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __param(1, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [auctions_service_1.AuctionsService, Function])
], AuctionsResolver);
//# sourceMappingURL=auctions.resolver.js.map