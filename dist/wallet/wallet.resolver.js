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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const wallet_service_1 = require("./wallet.service");
const wallet_entity_1 = require("./entities/wallet.entity");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const transaction_service_1 = require("../transaction/transaction.service");
const transactions_page_type_1 = require("../transaction/dto/transactions-page.type");
const transactions_filter_input_1 = require("../transaction/dto/transactions-filter.input");
const withdraw_input_1 = require("./dto/withdraw.input");
const wallets_page_type_1 = require("./dto/wallets-page.type");
const pagination_input_1 = require("../common/dto/pagination.input");
const decimal_js_1 = __importDefault(require("decimal.js"));
const pubsub_provider_1 = require("../infrastructure/pubsub/pubsub.provider");
const events_constants_1 = require("../infrastructure/pubsub/events.constants");
let WalletResolver = class WalletResolver {
    walletService;
    transactionService;
    pubSub;
    constructor(walletService, transactionService, pubSub) {
        this.walletService = walletService;
        this.transactionService = transactionService;
        this.pubSub = pubSub;
    }
    async wallets(input) {
        return this.walletService.getAllWallets(input);
    }
    async adminGetWallet(userId) {
        return this.walletService.getWalletByUserId(userId);
    }
    async myWallet(currentUser) {
        return this.walletService.getMyWallet(currentUser.sub);
    }
    async myTransactions(currentUser, input = new pagination_input_1.PaginationInput(), filter) {
        const wallet = await this.walletService.getMyWallet(currentUser.sub);
        return this.transactionService.getTransactionsByWalletId(wallet._id.toString(), input, filter);
    }
    availableBalance(wallet) {
        return new decimal_js_1.default(wallet.balance.toString())
            .minus(wallet.heldBalance.toString())
            .toString();
    }
    async withdraw(currentUser, input) {
        const { wallet } = await this.walletService.withdraw(currentUser.sub, input.amount);
        return wallet;
    }
    walletUpdated(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required to subscribe to wallet updates');
        }
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.WALLET_UPDATED);
    }
};
exports.WalletResolver = WalletResolver;
__decorate([
    (0, graphql_1.Query)(() => wallets_page_type_1.WalletsPage, { name: 'wallets' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput]),
    __metadata("design:returntype", Promise)
], WalletResolver.prototype, "wallets", null);
__decorate([
    (0, graphql_1.Query)(() => wallet_entity_1.Wallet, { name: 'adminGetWallet' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WalletResolver.prototype, "adminGetWallet", null);
__decorate([
    (0, graphql_1.Query)(() => wallet_entity_1.Wallet, { name: 'myWallet' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletResolver.prototype, "myWallet", null);
__decorate([
    (0, graphql_1.Query)(() => transactions_page_type_1.TransactionsPage, { name: 'myTransactions' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input', { nullable: true })),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        transactions_filter_input_1.TransactionsFilterInput]),
    __metadata("design:returntype", Promise)
], WalletResolver.prototype, "myTransactions", null);
__decorate([
    (0, graphql_1.ResolveField)(() => String, { name: 'availableBalance' }),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [wallet_entity_1.Wallet]),
    __metadata("design:returntype", String)
], WalletResolver.prototype, "availableBalance", null);
__decorate([
    (0, graphql_1.Mutation)(() => wallet_entity_1.Wallet, { name: 'withdraw' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, withdraw_input_1.WithdrawInput]),
    __metadata("design:returntype", Promise)
], WalletResolver.prototype, "withdraw", null);
__decorate([
    (0, graphql_1.Subscription)(() => wallet_entity_1.Wallet, {
        name: 'walletUpdated',
        filter: (payload, _variables, context) => {
            if (!context.user)
                return false;
            return (context.user.role === user_role_enum_1.UserRole.ADMIN ||
                payload.walletUpdated.userId.toString() === context.user.sub);
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WalletResolver.prototype, "walletUpdated", null);
exports.WalletResolver = WalletResolver = __decorate([
    (0, graphql_1.Resolver)(() => wallet_entity_1.Wallet),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(2, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [wallet_service_1.WalletService,
        transaction_service_1.TransactionService, Function])
], WalletResolver);
//# sourceMappingURL=wallet.resolver.js.map