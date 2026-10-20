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
exports.TransactionsFilterInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const transaction_type_enum_1 = require("../enums/transaction-type.enum");
const transaction_status_enum_1 = require("../enums/transaction-status.enum");
const is_after_decorator_1 = require("../../common/decorators/is-after.decorator");
const transactions_sort_input_1 = require("./transactions-sort.input");
let TransactionsFilterInput = class TransactionsFilterInput {
    search;
    walletId;
    walletIds;
    userId;
    type;
    status;
    startDate;
    endDate;
    expiresAtBefore;
    hasChild;
    sort;
};
exports.TransactionsFilterInput = TransactionsFilterInput;
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransactionsFilterInput.prototype, "search", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransactionsFilterInput.prototype, "walletId", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String], { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], TransactionsFilterInput.prototype, "walletIds", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransactionsFilterInput.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => transaction_type_enum_1.TransactionType, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(transaction_type_enum_1.TransactionType),
    __metadata("design:type", String)
], TransactionsFilterInput.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)(() => transaction_status_enum_1.TransactionStatus, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(transaction_status_enum_1.TransactionStatus),
    __metadata("design:type", String)
], TransactionsFilterInput.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], TransactionsFilterInput.prototype, "startDate", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, is_after_decorator_1.IsAfter)('startDate'),
    __metadata("design:type", Date)
], TransactionsFilterInput.prototype, "endDate", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], TransactionsFilterInput.prototype, "expiresAtBefore", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], TransactionsFilterInput.prototype, "hasChild", void 0);
__decorate([
    (0, graphql_1.Field)(() => transactions_sort_input_1.TransactionsSortInput, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => transactions_sort_input_1.TransactionsSortInput),
    __metadata("design:type", transactions_sort_input_1.TransactionsSortInput)
], TransactionsFilterInput.prototype, "sort", void 0);
exports.TransactionsFilterInput = TransactionsFilterInput = __decorate([
    (0, graphql_1.InputType)()
], TransactionsFilterInput);
//# sourceMappingURL=transactions-filter.input.js.map