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
exports.AdminWithdrawalsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const withdrawals_service_1 = require("../../withdrawals/withdrawals.service");
const withdrawal_request_entity_1 = require("../../withdrawals/entities/withdrawal-request.entity");
const dto_1 = require("../../withdrawals/dto");
const dto_2 = require("../dto");
const pagination_input_1 = require("../../common/dto/pagination.input");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_role_enum_1 = require("../../users/enums/user-role.enum");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const pubsub_provider_1 = require("../../infrastructure/pubsub/pubsub.provider");
const events_constants_1 = require("../../infrastructure/pubsub/events.constants");
let AdminWithdrawalsResolver = class AdminWithdrawalsResolver {
    withdrawalsService;
    pubSub;
    constructor(withdrawalsService, pubSub) {
        this.withdrawalsService = withdrawalsService;
        this.pubSub = pubSub;
    }
    async adminGetWithdrawals(pagination, filter) {
        return this.withdrawalsService.adminGetWithdrawals(pagination, filter);
    }
    async adminGetWithdrawal(id) {
        return this.withdrawalsService.adminGetWithdrawal(id);
    }
    async adminStartWithdrawalProcessing(admin, requestId) {
        return this.withdrawalsService.adminStartProcessing(admin.sub, requestId);
    }
    async adminCompleteWithdrawal(admin, input) {
        return this.withdrawalsService.adminCompleteWithdrawal(admin.sub, input);
    }
    async adminRejectWithdrawal(admin, input) {
        return this.withdrawalsService.adminRejectWithdrawal(admin.sub, input);
    }
    adminWithdrawalFeed(user) {
        if (!user || user.role !== user_role_enum_1.UserRole.ADMIN) {
            throw new common_1.UnauthorizedException('Admin privilege required to subscribe to admin withdrawal feed');
        }
        return this.pubSub.asyncIterableIterator([
            events_constants_1.PUB_SUB_EVENTS.WITHDRAWAL_REQUESTED,
            events_constants_1.PUB_SUB_EVENTS.WITHDRAWAL_STATUS_CHANGED,
        ]);
    }
};
exports.AdminWithdrawalsResolver = AdminWithdrawalsResolver;
__decorate([
    (0, graphql_1.Query)(() => dto_1.WithdrawalsPage, { name: 'adminGetWithdrawals' }),
    __param(0, (0, graphql_1.Args)('pagination')),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        dto_1.WithdrawalsFilterInput]),
    __metadata("design:returntype", Promise)
], AdminWithdrawalsResolver.prototype, "adminGetWithdrawals", null);
__decorate([
    (0, graphql_1.Query)(() => withdrawal_request_entity_1.WithdrawalRequest, { name: 'adminGetWithdrawal' }),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminWithdrawalsResolver.prototype, "adminGetWithdrawal", null);
__decorate([
    (0, graphql_1.Mutation)(() => withdrawal_request_entity_1.WithdrawalRequest, { name: 'adminStartWithdrawalProcessing' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('requestId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminWithdrawalsResolver.prototype, "adminStartWithdrawalProcessing", null);
__decorate([
    (0, graphql_1.Mutation)(() => withdrawal_request_entity_1.WithdrawalRequest, { name: 'adminCompleteWithdrawal' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_2.AdminCompleteWithdrawalInput]),
    __metadata("design:returntype", Promise)
], AdminWithdrawalsResolver.prototype, "adminCompleteWithdrawal", null);
__decorate([
    (0, graphql_1.Mutation)(() => withdrawal_request_entity_1.WithdrawalRequest, { name: 'adminRejectWithdrawal' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_2.AdminRejectWithdrawalInput]),
    __metadata("design:returntype", Promise)
], AdminWithdrawalsResolver.prototype, "adminRejectWithdrawal", null);
__decorate([
    (0, graphql_1.Subscription)(() => withdrawal_request_entity_1.WithdrawalRequest, {
        name: 'adminWithdrawalFeed',
        resolve: (payload) => payload.adminWithdrawalFeed ||
            payload.withdrawalRequested ||
            payload.withdrawalStatusChanged,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminWithdrawalsResolver.prototype, "adminWithdrawalFeed", null);
exports.AdminWithdrawalsResolver = AdminWithdrawalsResolver = __decorate([
    (0, graphql_1.Resolver)(() => withdrawal_request_entity_1.WithdrawalRequest),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(1, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [withdrawals_service_1.WithdrawalsService, Function])
], AdminWithdrawalsResolver);
//# sourceMappingURL=admin-withdrawals.resolver.js.map