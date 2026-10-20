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
exports.AdminCompleteWithdrawalInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
let AdminCompleteWithdrawalInput = class AdminCompleteWithdrawalInput {
    withdrawalId;
    adminReference;
    receiptUrl;
};
exports.AdminCompleteWithdrawalInput = AdminCompleteWithdrawalInput;
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminCompleteWithdrawalInput.prototype, "withdrawalId", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'ADMIN_REFERENCE_REQUIRED' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminCompleteWithdrawalInput.prototype, "adminReference", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'RECEIPT_URL_REQUIRED' }),
    (0, class_validator_1.IsUrl)({}, { message: 'RECEIPT_URL_INVALID' }),
    __metadata("design:type", String)
], AdminCompleteWithdrawalInput.prototype, "receiptUrl", void 0);
exports.AdminCompleteWithdrawalInput = AdminCompleteWithdrawalInput = __decorate([
    (0, graphql_1.InputType)()
], AdminCompleteWithdrawalInput);
//# sourceMappingURL=admin-complete-withdrawal.input.js.map