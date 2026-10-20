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
exports.AdminUsersResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_role_enum_1 = require("../../users/enums/user-role.enum");
const users_service_1 = require("../../users/users.service");
const wallet_service_1 = require("../../wallet/wallet.service");
const auctions_service_1 = require("../../auctions/auctions.service");
const transaction_service_1 = require("../../transaction/transaction.service");
const user_entity_1 = require("../../users/entities/user.entity");
const users_page_type_1 = require("../../users/dto/users-page.type");
const pagination_input_1 = require("../../common/dto/pagination.input");
const users_filter_input_1 = require("../../users/dto/users-filter.input");
const admin_user_details_dto_1 = require("../dto/admin-user-details.dto");
let AdminUsersResolver = class AdminUsersResolver {
    usersService;
    walletService;
    auctionsService;
    transactionService;
    constructor(usersService, walletService, auctionsService, transactionService) {
        this.usersService = usersService;
        this.walletService = walletService;
        this.auctionsService = auctionsService;
        this.transactionService = transactionService;
    }
    async adminGetUsers(input, filter) {
        return this.usersService.findAll(input, filter || {});
    }
    async adminGetUserDetails(userId) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const defaultPagination = { page: 1, limit: 5 };
        const wallet = await this.walletService
            .getWalletByUserId(userId)
            .catch(() => undefined);
        const recentAuctions = await this.auctionsService
            .findMyAuctions(userId, defaultPagination, {})
            .catch(() => undefined);
        const recentTransactions = wallet
            ? await this.transactionService
                .getTransactionsByWalletId(wallet._id.toString(), defaultPagination)
                .catch(() => undefined)
            : undefined;
        return {
            user,
            wallet,
            recentAuctions,
            recentTransactions,
        };
    }
    async adminToggleUserBan(userId) {
        return this.usersService.toggleBan(userId);
    }
};
exports.AdminUsersResolver = AdminUsersResolver;
__decorate([
    (0, graphql_1.Query)(() => users_page_type_1.UsersPage),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        users_filter_input_1.UsersFilterInput]),
    __metadata("design:returntype", Promise)
], AdminUsersResolver.prototype, "adminGetUsers", null);
__decorate([
    (0, graphql_1.Query)(() => admin_user_details_dto_1.AdminUserDetails),
    __param(0, (0, graphql_1.Args)('userId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersResolver.prototype, "adminGetUserDetails", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_entity_1.User),
    __param(0, (0, graphql_1.Args)('userId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUsersResolver.prototype, "adminToggleUserBan", null);
exports.AdminUsersResolver = AdminUsersResolver = __decorate([
    (0, graphql_1.Resolver)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        wallet_service_1.WalletService,
        auctions_service_1.AuctionsService,
        transaction_service_1.TransactionService])
], AdminUsersResolver);
//# sourceMappingURL=admin-users.resolver.js.map