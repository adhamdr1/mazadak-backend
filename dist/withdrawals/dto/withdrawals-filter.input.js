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
exports.WithdrawalsFilterInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const withdrawal_status_enum_1 = require("../enums/withdrawal-status.enum");
const payout_method_enum_1 = require("../enums/payout-method.enum");
const sort_order_enum_1 = require("../../common/enums/sort-order.enum");
let WithdrawalsFilterInput = class WithdrawalsFilterInput {
    search;
    userId;
    status;
    payoutMethod;
    sortOrder = sort_order_enum_1.SortOrder.DESC;
    startDate;
    endDate;
};
exports.WithdrawalsFilterInput = WithdrawalsFilterInput;
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WithdrawalsFilterInput.prototype, "search", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WithdrawalsFilterInput.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => withdrawal_status_enum_1.WithdrawalStatus, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(withdrawal_status_enum_1.WithdrawalStatus),
    __metadata("design:type", String)
], WithdrawalsFilterInput.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => payout_method_enum_1.PayoutMethod, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(payout_method_enum_1.PayoutMethod),
    __metadata("design:type", String)
], WithdrawalsFilterInput.prototype, "payoutMethod", void 0);
__decorate([
    (0, graphql_1.Field)(() => sort_order_enum_1.SortOrder, { nullable: true, defaultValue: sort_order_enum_1.SortOrder.DESC }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(sort_order_enum_1.SortOrder),
    __metadata("design:type", String)
], WithdrawalsFilterInput.prototype, "sortOrder", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], WithdrawalsFilterInput.prototype, "startDate", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], WithdrawalsFilterInput.prototype, "endDate", void 0);
exports.WithdrawalsFilterInput = WithdrawalsFilterInput = __decorate([
    (0, graphql_1.InputType)()
], WithdrawalsFilterInput);
//# sourceMappingURL=withdrawals-filter.input.js.map