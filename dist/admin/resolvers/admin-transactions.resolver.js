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
exports.AdminTransactionsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_role_enum_1 = require("../../users/enums/user-role.enum");
const transaction_service_1 = require("../../transaction/transaction.service");
const wallet_service_1 = require("../../wallet/wallet.service");
const users_service_1 = require("../../users/users.service");
const transactions_page_type_1 = require("../../transaction/dto/transactions-page.type");
const pagination_input_1 = require("../../common/dto/pagination.input");
const transactions_filter_input_1 = require("../../transaction/dto/transactions-filter.input");
let AdminTransactionsResolver = class AdminTransactionsResolver {
    transactionService;
    walletService;
    usersService;
    constructor(transactionService, walletService, usersService) {
        this.transactionService = transactionService;
        this.walletService = walletService;
        this.usersService = usersService;
    }
    async adminGetTransactions(input, filter) {
        const effectiveFilter = { ...(filter || {}) };
        if (effectiveFilter.userId && !effectiveFilter.walletId) {
            try {
                const wallet = await this.walletService.getWalletByUserId(effectiveFilter.userId);
                effectiveFilter.walletId = wallet._id.toString();
            }
            catch {
                return {
                    items: [],
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                };
            }
        }
        if (effectiveFilter.search && !effectiveFilter.walletId) {
            const trimmed = effectiveFilter.search.trim();
            if (trimmed.length > 0) {
                try {
                    const usersPage = await this.usersService.findAll({ page: 1, limit: 50 }, { search: trimmed });
                    if (usersPage.items.length > 0) {
                        const userIds = usersPage.items.map((u) => u._id.toString());
                        const wallets = await this.walletService.getWalletsByUserIds(userIds);
                        if (wallets.length > 0) {
                            effectiveFilter.walletIds = wallets.map((w) => w._id.toString());
                        }
                    }
                }
                catch {
                }
            }
        }
        return this.transactionService.getAllTransactions(input, effectiveFilter);
    }
};
exports.AdminTransactionsResolver = AdminTransactionsResolver;
__decorate([
    (0, graphql_1.Query)(() => transactions_page_type_1.TransactionsPage),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        transactions_filter_input_1.TransactionsFilterInput]),
    __metadata("design:returntype", Promise)
], AdminTransactionsResolver.prototype, "adminGetTransactions", null);
exports.AdminTransactionsResolver = AdminTransactionsResolver = __decorate([
    (0, graphql_1.Resolver)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [transaction_service_1.TransactionService,
        wallet_service_1.WalletService,
        users_service_1.UsersService])
], AdminTransactionsResolver);
//# sourceMappingURL=admin-transactions.resolver.js.map