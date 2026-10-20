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
exports.AdminFinancialResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const admin_analytics_service_1 = require("../services/admin-analytics.service");
const withdrawals_service_1 = require("../../withdrawals/withdrawals.service");
const treasury_stats_type_1 = require("../dto/treasury-stats.type");
const admin_adjust_balance_input_1 = require("../dto/admin-adjust-balance.input");
const wallet_entity_1 = require("../../wallet/entities/wallet.entity");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_role_enum_1 = require("../../users/enums/user-role.enum");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let AdminFinancialResolver = class AdminFinancialResolver {
    adminAnalyticsService;
    withdrawalsService;
    constructor(adminAnalyticsService, withdrawalsService) {
        this.adminAnalyticsService = adminAnalyticsService;
        this.withdrawalsService = withdrawalsService;
    }
    async adminGetTreasuryStats() {
        return this.adminAnalyticsService.getTreasuryStats();
    }
    async adminAdjustUserBalance(admin, input) {
        return this.withdrawalsService.adminAdjustBalance(admin.sub, input);
    }
};
exports.AdminFinancialResolver = AdminFinancialResolver;
__decorate([
    (0, graphql_1.Query)(() => treasury_stats_type_1.TreasuryStats, { name: 'adminGetTreasuryStats' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminFinancialResolver.prototype, "adminGetTreasuryStats", null);
__decorate([
    (0, graphql_1.Mutation)(() => wallet_entity_1.Wallet, { name: 'adminAdjustUserBalance' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, admin_adjust_balance_input_1.AdminAdjustBalanceInput]),
    __metadata("design:returntype", Promise)
], AdminFinancialResolver.prototype, "adminAdjustUserBalance", null);
exports.AdminFinancialResolver = AdminFinancialResolver = __decorate([
    (0, graphql_1.Resolver)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [admin_analytics_service_1.AdminAnalyticsService,
        withdrawals_service_1.WithdrawalsService])
], AdminFinancialResolver);
//# sourceMappingURL=admin-financial.resolver.js.map