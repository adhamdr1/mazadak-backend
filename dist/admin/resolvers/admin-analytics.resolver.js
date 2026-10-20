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
exports.AdminAnalyticsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_role_enum_1 = require("../../users/enums/user-role.enum");
const dashboard_stats_dto_1 = require("../dto/dashboard-stats.dto");
const admin_analytics_service_1 = require("../services/admin-analytics.service");
let AdminAnalyticsResolver = class AdminAnalyticsResolver {
    adminAnalyticsService;
    constructor(adminAnalyticsService) {
        this.adminAnalyticsService = adminAnalyticsService;
    }
    async adminGetDashboardStats() {
        return this.adminAnalyticsService.getDashboardStats();
    }
};
exports.AdminAnalyticsResolver = AdminAnalyticsResolver;
__decorate([
    (0, graphql_1.Query)(() => dashboard_stats_dto_1.DashboardStats),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminAnalyticsResolver.prototype, "adminGetDashboardStats", null);
exports.AdminAnalyticsResolver = AdminAnalyticsResolver = __decorate([
    (0, graphql_1.Resolver)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [admin_analytics_service_1.AdminAnalyticsService])
], AdminAnalyticsResolver);
//# sourceMappingURL=admin-analytics.resolver.js.map