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
exports.TransactionResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const transaction_service_1 = require("./transaction.service");
const transactions_page_type_1 = require("./dto/transactions-page.type");
const transactions_filter_input_1 = require("./dto/transactions-filter.input");
const pagination_input_1 = require("../common/dto/pagination.input");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let TransactionResolver = class TransactionResolver {
    transactionService;
    constructor(transactionService) {
        this.transactionService = transactionService;
    }
    async transactions(input = new pagination_input_1.PaginationInput(), filter) {
        return this.transactionService.getAllTransactions(input, filter);
    }
};
exports.TransactionResolver = TransactionResolver;
__decorate([
    (0, graphql_1.Query)(() => transactions_page_type_1.TransactionsPage, { name: 'transactions' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input', { nullable: true })),
    __param(1, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_input_1.PaginationInput,
        transactions_filter_input_1.TransactionsFilterInput]),
    __metadata("design:returntype", Promise)
], TransactionResolver.prototype, "transactions", null);
exports.TransactionResolver = TransactionResolver = __decorate([
    (0, graphql_1.Resolver)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [transaction_service_1.TransactionService])
], TransactionResolver);
//# sourceMappingURL=transaction.resolver.js.map