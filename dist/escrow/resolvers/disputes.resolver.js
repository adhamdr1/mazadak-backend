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
exports.DisputesResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
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
let DisputesResolver = class DisputesResolver {
    disputesService;
    pubSub;
    constructor(disputesService, pubSub) {
        this.disputesService = disputesService;
        this.pubSub = pubSub;
    }
    async getDispute(id, currentUser) {
        const dispute = await this.disputesService.getDisputeById(id);
        const isParty = dispute.openedById.toString() === currentUser.sub ||
            dispute.againstUserId.toString() === currentUser.sub;
        const isAdmin = currentUser.role === user_role_enum_1.UserRole.ADMIN;
        if (!isParty && !isAdmin) {
            throw new exceptions_1.EscrowUnauthorizedException();
        }
        return dispute;
    }
    async getDisputeByAuction(auctionId, currentUser) {
        const dispute = await this.disputesService.getDisputeByAuctionId(auctionId);
        if (!dispute)
            return null;
        const isParty = dispute.openedById.toString() === currentUser.sub ||
            dispute.againstUserId.toString() === currentUser.sub;
        const isAdmin = currentUser.role === user_role_enum_1.UserRole.ADMIN;
        if (!isParty && !isAdmin) {
            throw new exceptions_1.EscrowUnauthorizedException();
        }
        return dispute;
    }
    async getMyDisputes(currentUser, input, filter) {
        return this.disputesService.getMyDisputes(currentUser.sub, input, filter);
    }
    async getAllDisputes(input, filter) {
        return this.disputesService.getAllDisputes(input, filter);
    }
    async openDispute(currentUser, input) {
        return this.disputesService.openDispute(currentUser.sub, input);
    }
    async cancelDispute(currentUser, disputeId) {
        return this.disputesService.cancelDispute(currentUser.sub, disputeId);
    }
    async updateDisputeStatus(input) {
        return this.disputesService.updateDisputeStatus(input);
    }
    async resolveDispute(currentUser, input) {
        return this.disputesService.resolveDispute(currentUser.sub, input);
    }
    disputeStatusChanged(_disputeId) {
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.DISPUTE_STATUS_CHANGED);
    }
};
exports.DisputesResolver = DisputesResolver;
__decorate([
    (0, graphql_1.Query)(() => entities_1.Dispute, { name: 'dispute' }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DisputesResolver.prototype, "getDispute", null);
__decorate([
    (0, graphql_1.Query)(() => entities_1.Dispute, { name: 'disputeByAuction', nullable: true }),
    __param(0, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DisputesResolver.prototype, "getDisputeByAuction", null);
__decorate([
    (0, graphql_1.Query)(() => dto_1.DisputesPage, { name: 'myDisputes' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input', { nullable: true })),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        dto_1.DisputeFilterInput]),
    __metadata("design:returntype", Promise)
], DisputesResolver.prototype, "getMyDisputes", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Query)(() => dto_1.DisputesPage, { name: 'allDisputes' }),
    __param(0, (0, graphql_1.Args)('input', { nullable: true })),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        dto_1.DisputeFilterInput]),
    __metadata("design:returntype", Promise)
], DisputesResolver.prototype, "getAllDisputes", null);
__decorate([
    (0, graphql_1.Mutation)(() => entities_1.Dispute, { name: 'openDispute' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateDisputeInput]),
    __metadata("design:returntype", Promise)
], DisputesResolver.prototype, "openDispute", null);
__decorate([
    (0, graphql_1.Mutation)(() => entities_1.Dispute, { name: 'cancelDispute' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('disputeId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DisputesResolver.prototype, "cancelDispute", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Mutation)(() => entities_1.Dispute, { name: 'updateDisputeStatus' }),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UpdateDisputeStatusInput]),
    __metadata("design:returntype", Promise)
], DisputesResolver.prototype, "updateDisputeStatus", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, graphql_1.Mutation)(() => entities_1.Dispute, { name: 'resolveDispute' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ResolveDisputeInput]),
    __metadata("design:returntype", Promise)
], DisputesResolver.prototype, "resolveDispute", null);
__decorate([
    (0, graphql_1.Subscription)(() => dto_1.DisputeStatusChangedPayload, {
        name: 'disputeStatusChanged',
        filter: (payload, variables, context) => {
            const user = context?.user;
            if (!user)
                return false;
            const data = payload.disputeStatusChanged;
            if (!data)
                return false;
            const isParty = data.openedById === user.sub || data.againstUserId === user.sub;
            const isAdmin = user.role === user_role_enum_1.UserRole.ADMIN;
            if (!isParty && !isAdmin)
                return false;
            if (!variables?.disputeId)
                return true;
            const targetId = data.disputeId?.toString();
            return targetId === variables.disputeId;
        },
        resolve: (payload) => payload.disputeStatusChanged,
    }),
    __param(0, (0, graphql_1.Args)('disputeId', { type: () => graphql_1.ID, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DisputesResolver.prototype, "disputeStatusChanged", null);
exports.DisputesResolver = DisputesResolver = __decorate([
    (0, graphql_1.Resolver)(() => entities_1.Dispute),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __param(1, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [services_1.DisputesService,
        graphql_redis_subscriptions_1.RedisPubSub])
], DisputesResolver);
//# sourceMappingURL=disputes.resolver.js.map