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
exports.AdminAdjustBalanceInput = exports.AdminAdjustBalanceType = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
var AdminAdjustBalanceType;
(function (AdminAdjustBalanceType) {
    AdminAdjustBalanceType["CREDIT"] = "CREDIT";
    AdminAdjustBalanceType["DEBIT"] = "DEBIT";
})(AdminAdjustBalanceType || (exports.AdminAdjustBalanceType = AdminAdjustBalanceType = {}));
(0, graphql_1.registerEnumType)(AdminAdjustBalanceType, {
    name: 'AdminAdjustBalanceType',
    description: 'Type of manual admin balance adjustment (CREDIT or DEBIT)',
});
let AdminAdjustBalanceInput = class AdminAdjustBalanceInput {
    userId;
    amount;
    type;
    reason;
};
exports.AdminAdjustBalanceInput = AdminAdjustBalanceInput;
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminAdjustBalanceInput.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, class_validator_1.IsPositive)({ message: 'AMOUNT_MUST_BE_POSITIVE' }),
    __metadata("design:type", Number)
], AdminAdjustBalanceInput.prototype, "amount", void 0);
__decorate([
    (0, graphql_1.Field)(() => AdminAdjustBalanceType),
    (0, class_validator_1.IsEnum)(AdminAdjustBalanceType),
    __metadata("design:type", String)
], AdminAdjustBalanceInput.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'REASON_REQUIRED' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10, { message: 'REASON_TOO_SHORT' }),
    __metadata("design:type", String)
], AdminAdjustBalanceInput.prototype, "reason", void 0);
exports.AdminAdjustBalanceInput = AdminAdjustBalanceInput = __decorate([
    (0, graphql_1.InputType)()
], AdminAdjustBalanceInput);
//# sourceMappingURL=admin-adjust-balance.input.js.map