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
exports.WithdrawalsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const withdrawals_service_1 = require("./withdrawals.service");
const withdrawal_request_entity_1 = require("./entities/withdrawal-request.entity");
const payout_method_enum_1 = require("./enums/payout-method.enum");
const dto_1 = require("./dto");
const pagination_input_1 = require("../common/dto/pagination.input");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const pubsub_provider_1 = require("../infrastructure/pubsub/pubsub.provider");
const events_constants_1 = require("../infrastructure/pubsub/events.constants");
let WithdrawalsResolver = class WithdrawalsResolver {
    withdrawalsService;
    pubSub;
    constructor(withdrawalsService, pubSub) {
        this.withdrawalsService = withdrawalsService;
        this.pubSub = pubSub;
    }
    withdrawalFeePreview(amount, payoutMethod) {
        return this.withdrawalsService.calculateFee(amount, payoutMethod);
    }
    async myWithdrawals(currentUser, pagination, filter) {
        return this.withdrawalsService.getMyWithdrawals(currentUser.sub, pagination, filter);
    }
    async myWithdrawal(currentUser, id) {
        return this.withdrawalsService.getMyWithdrawal(currentUser.sub, id);
    }
    async requestWithdrawal(currentUser, input) {
        return this.withdrawalsService.requestWithdrawal(currentUser.sub, input);
    }
    async cancelWithdrawal(currentUser, id) {
        return this.withdrawalsService.cancelWithdrawal(currentUser.sub, id);
    }
    myWithdrawalUpdated(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required to subscribe to withdrawal updates');
        }
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.WITHDRAWAL_STATUS_CHANGED);
    }
};
exports.WithdrawalsResolver = WithdrawalsResolver;
__decorate([
    (0, graphql_1.Query)(() => dto_1.WithdrawalFeePreview, { name: 'withdrawalFeePreview' }),
    __param(0, (0, graphql_1.Args)('amount')),
    __param(1, (0, graphql_1.Args)('payoutMethod', { type: () => payout_method_enum_1.PayoutMethod })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", dto_1.WithdrawalFeePreview)
], WithdrawalsResolver.prototype, "withdrawalFeePreview", null);
__decorate([
    (0, graphql_1.Query)(() => dto_1.WithdrawalsPage, { name: 'myWithdrawals' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('pagination')),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        dto_1.WithdrawalsFilterInput]),
    __metadata("design:returntype", Promise)
], WithdrawalsResolver.prototype, "myWithdrawals", null);
__decorate([
    (0, graphql_1.Query)(() => withdrawal_request_entity_1.WithdrawalRequest, { name: 'myWithdrawal' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WithdrawalsResolver.prototype, "myWithdrawal", null);
__decorate([
    (0, graphql_1.Mutation)(() => withdrawal_request_entity_1.WithdrawalRequest, { name: 'requestWithdrawal' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.RequestWithdrawalInput]),
    __metadata("design:returntype", Promise)
], WithdrawalsResolver.prototype, "requestWithdrawal", null);
__decorate([
    (0, graphql_1.Mutation)(() => withdrawal_request_entity_1.WithdrawalRequest, { name: 'cancelWithdrawal' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WithdrawalsResolver.prototype, "cancelWithdrawal", null);
__decorate([
    (0, graphql_1.Subscription)(() => withdrawal_request_entity_1.WithdrawalRequest, {
        name: 'myWithdrawalUpdated',
        filter: (payload, _variables, context) => {
            const item = payload.myWithdrawalUpdated || payload.withdrawalStatusChanged;
            if (!context.user || !item)
                return false;
            return (context.user.role === user_role_enum_1.UserRole.ADMIN ||
                item.userId.toString() === context.user.sub);
        },
        resolve: (payload) => payload.myWithdrawalUpdated || payload.withdrawalStatusChanged,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WithdrawalsResolver.prototype, "myWithdrawalUpdated", null);
exports.WithdrawalsResolver = WithdrawalsResolver = __decorate([
    (0, graphql_1.Resolver)(() => withdrawal_request_entity_1.WithdrawalRequest),
    __param(1, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [withdrawals_service_1.WithdrawalsService, Function])
], WithdrawalsResolver);
//# sourceMappingURL=withdrawals.resolver.js.map