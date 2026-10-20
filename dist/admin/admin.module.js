"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const users_module_1 = require("../users/users.module");
const auctions_module_1 = require("../auctions/auctions.module");
const wallet_module_1 = require("../wallet/wallet.module");
const transaction_module_1 = require("../transaction/transaction.module");
const withdrawals_module_1 = require("../withdrawals/withdrawals.module");
const escrow_module_1 = require("../escrow/escrow.module");
const admin_users_resolver_1 = require("./resolvers/admin-users.resolver");
const admin_auctions_resolver_1 = require("./resolvers/admin-auctions.resolver");
const admin_transactions_resolver_1 = require("./resolvers/admin-transactions.resolver");
const admin_analytics_resolver_1 = require("./resolvers/admin-analytics.resolver");
const admin_withdrawals_resolver_1 = require("./resolvers/admin-withdrawals.resolver");
const admin_financial_resolver_1 = require("./resolvers/admin-financial.resolver");
const admin_analytics_service_1 = require("./services/admin-analytics.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            auctions_module_1.AuctionsModule,
            wallet_module_1.WalletModule,
            transaction_module_1.TransactionModule,
            withdrawals_module_1.WithdrawalsModule,
            escrow_module_1.EscrowModule,
        ],
        providers: [
            admin_users_resolver_1.AdminUsersResolver,
            admin_auctions_resolver_1.AdminAuctionsResolver,
            admin_transactions_resolver_1.AdminTransactionsResolver,
            admin_analytics_resolver_1.AdminAnalyticsResolver,
            admin_withdrawals_resolver_1.AdminWithdrawalsResolver,
            admin_financial_resolver_1.AdminFinancialResolver,
            admin_analytics_service_1.AdminAnalyticsService,
        ],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map