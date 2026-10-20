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
exports.RequestWithdrawalInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const payout_method_enum_1 = require("../enums/payout-method.enum");
const payout_details_input_1 = require("./payout-details.input");
let RequestWithdrawalInput = class RequestWithdrawalInput {
    amount;
    payoutMethod;
    payoutDetails;
};
exports.RequestWithdrawalInput = RequestWithdrawalInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(50, { message: 'WITHDRAWAL_BELOW_MINIMUM' }),
    (0, class_validator_1.Max)(10_000_000, { message: 'WITHDRAWAL_EXCEEDS_MAXIMUM' }),
    __metadata("design:type", Number)
], RequestWithdrawalInput.prototype, "amount", void 0);
__decorate([
    (0, graphql_1.Field)(() => payout_method_enum_1.PayoutMethod),
    (0, class_validator_1.IsEnum)(payout_method_enum_1.PayoutMethod),
    __metadata("design:type", String)
], RequestWithdrawalInput.prototype, "payoutMethod", void 0);
__decorate([
    (0, graphql_1.Field)(() => payout_details_input_1.PayoutDetailsInput),
    (0, class_validator_1.IsNotEmptyObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => payout_details_input_1.PayoutDetailsInput),
    __metadata("design:type", payout_details_input_1.PayoutDetailsInput)
], RequestWithdrawalInput.prototype, "payoutDetails", void 0);
exports.RequestWithdrawalInput = RequestWithdrawalInput = __decorate([
    (0, graphql_1.InputType)()
], RequestWithdrawalInput);
//# sourceMappingURL=request-withdrawal.input.js.map