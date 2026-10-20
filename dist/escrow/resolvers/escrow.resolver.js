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
exports.EscrowResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const graphql_redis_subscriptions_1 = require("graphql-redis-subscriptions");
const services_1 = require("../services");
const entities_1 = require("../entities");
const dto_1 = require("../dto");
const pagination_input_1 = require("../../common/dto/pagination.input");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_role_enum_1 = require("../../users/enums/user-role.enum");
const exceptions_1 = require("../exceptions");
const pubsub_provider_1 = require("../../infrastructure/pubsub/pubsub.provider");
const events_constants_1 = require("../../infrastructure/pubsub/events.constants");
const auction_entity_1 = require("../../auctions/entities/auction.entity");
const get_auction_by_id_query_1 = require("../../auctions/queries/get-auction-by-id.query");
let EscrowResolver = class EscrowResolver {
    escrowService;
    queryBus;
    pubSub;
    constructor(escrowService, queryBus, pubSub) {
        this.escrowService = escrowService;
        this.queryBus = queryBus;
        this.pubSub = pubSub;
    }
    async auction(escrow) {
        if (!escrow.auctionId)
            return null;
        return this.queryBus.execute(new get_auction_by_id_query_1.GetAuctionByIdQuery(escrow.auctionId.toString()));
    }
    inspectionDurationHours() {
        return 168;
    }
    async getEscrowByAuction(auctionId, currentUser) {
        const escrow = await this.escrowService.getEscrowByAuctionId(auctionId);
        if (!escrow)
            return null;
        const isBuyer = escrow.buyerId.toString() === currentUser.sub;
        const isSeller = escrow.sellerId.toString() === currentUser.sub;
        const isAdmin = currentUser.role === user_role_enum_1.UserRole.ADMIN;
        if (!isBuyer && !isSeller && !isAdmin) {
            throw new exceptions_1.EscrowUnauthorizedException();
        }
        return escrow;
    }
    async getEscrow(id, currentUser) {
        const escrow = await this.escrowService.getEscrowById(id);
        const isBuyer = escrow.buyerId.toString() === currentUser.sub;
        const isSeller = escrow.sellerId.toString() === currentUser.sub;
        const isAdmin = currentUser.role === user_role_enum_1.UserRole.ADMIN;
        if (!isBuyer && !isSeller && !isAdmin) {
            throw new exceptions_1.EscrowUnauthorizedException();
        }
        return escrow;
    }
    async getMyEscrows(currentUser, input, filter) {
        return this.escrowService.getMyEscrows(currentUser.sub, input, filter);
    }
    async getAllEscrows(input, filter) {
        return this.escrowService.getAllEscrows(input, filter);
    }
    async confirmDelivery(currentUser, escrowId) {
        return this.escrowService.confirmDelivery(currentUser.sub, escrowId);
    }
    async releaseEscrow(escrowId, reason) {
        return this.escrowService.releaseEscrow(escrowId, reason ?? 'Admin manual release');
    }
    async refundEscrow(escrowId, reason) {
        return this.escrowService.refundEscrow(escrowId, reason ?? 'Admin manual refund');
    }
    escrowStatusChanged(_escrowId) {
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.ESCROW_STATUS_CHANGED);
    }
};
exports.EscrowResolver = EscrowResolver;
__decorate([
    (0, graphql_1.ResolveField)(() => auction_entity_1.Auction, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entities_1.Escrow]),
    __metadata("design:returntype", Promise)
], EscrowResolver.prototype, "auction", null);
__decorate([
    (0, graphql_1.ResolveField)(() => graphql_1.Int, { name: 'inspectionDurationHours' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Number)
], EscrowResolver.prototype, "inspectionDurationHours", null);
__decorate([
    (0, graphql_1.Query)(() => entities_1.Escrow, { name: 'escrowByAuction', nullable: true }),
    __param(0, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EscrowResolver.prototype, "getEscrowByAuction", null);
__decorate([
    (0, graphql_1.Query)(() => entities_1.Escrow, { name: 'escrow' }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EscrowResolver.prototype, "getEscrow", null);
__decorate([
    (0, graphql_1.Query)(() => dto_1.EscrowsPage, { name: 'myEscrows' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input', { nullable: true })),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        dto_1.EscrowFilterInput]),
    __metadata("design:returntype", Promise)
], EscrowResolver.prototype, "getMyEscrows", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Query)(() => dto_1.EscrowsPage, { name: 'allEscrows' }),
    __param(0, (0, graphql_1.Args)('input', { nullable: true })),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        dto_1.EscrowFilterInput]),
    __metadata("design:returntype", Promise)
], EscrowResolver.prototype, "getAllEscrows", null);
__decorate([
    (0, graphql_1.Mutation)(() => entities_1.Escrow, { name: 'confirmDelivery' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('escrowId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EscrowResolver.prototype, "confirmDelivery", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Mutation)(() => entities_1.Escrow, { name: 'releaseEscrow' }),
    __param(0, (0, graphql_1.Args)('escrowId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('reason', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EscrowResolver.prototype, "releaseEscrow", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Mutation)(() => entities_1.Escrow, { name: 'refundEscrow' }),
    __param(0, (0, graphql_1.Args)('escrowId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('reason', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EscrowResolver.prototype, "refundEscrow", null);
__decorate([
    (0, graphql_1.Subscription)(() => dto_1.EscrowStatusChangedPayload, {
        name: 'escrowStatusChanged',
        filter: (payload, variables, context) => {
            if (!context.user)
                return false;
            const isTarget = payload.escrowStatusChanged.escrowId.toString() === variables.escrowId;
            const isAuthorized = payload.escrowStatusChanged.buyerId === context.user.sub ||
                payload.escrowStatusChanged.sellerId === context.user.sub ||
                context.user.role === user_role_enum_1.UserRole.ADMIN;
            return isTarget && isAuthorized;
        },
        resolve: (payload) => payload.escrowStatusChanged,
    }),
    __param(0, (0, graphql_1.Args)('escrowId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EscrowResolver.prototype, "escrowStatusChanged", null);
exports.EscrowResolver = EscrowResolver = __decorate([
    (0, graphql_1.Resolver)(() => entities_1.Escrow),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __param(2, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [services_1.EscrowService,
        cqrs_1.QueryBus,
        graphql_redis_subscriptions_1.RedisPubSub])
], EscrowResolver);
//# sourceMappingURL=escrow.resolver.js.map