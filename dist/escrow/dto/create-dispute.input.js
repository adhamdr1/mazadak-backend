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
exports.CreateDisputeInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const dispute_reason_enum_1 = require("../enums/dispute-reason.enum");
let CreateDisputeInput = class CreateDisputeInput {
    auctionId;
    reason;
    description;
    evidenceUrls = [];
};
exports.CreateDisputeInput = CreateDisputeInput;
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, class_validator_1.IsMongoId)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDisputeInput.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => dispute_reason_enum_1.DisputeReason),
    (0, class_validator_1.IsEnum)(dispute_reason_enum_1.DisputeReason),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDisputeInput.prototype, "reason", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateDisputeInput.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String], { nullable: true, defaultValue: [] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(5),
    (0, class_validator_1.IsUrl)({}, { each: true }),
    __metadata("design:type", Array)
], CreateDisputeInput.prototype, "evidenceUrls", void 0);
exports.CreateDisputeInput = CreateDisputeInput = __decorate([
    (0, graphql_1.InputType)()
], CreateDisputeInput);
//# sourceMappingURL=create-dispute.input.js.map