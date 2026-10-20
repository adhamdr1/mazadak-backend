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
exports.ResolveDisputeInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const dispute_resolution_enum_1 = require("../enums/dispute-resolution.enum");
let ResolveDisputeInput = class ResolveDisputeInput {
    disputeId;
    decision;
    adminNotes;
};
exports.ResolveDisputeInput = ResolveDisputeInput;
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, class_validator_1.IsMongoId)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ResolveDisputeInput.prototype, "disputeId", void 0);
__decorate([
    (0, graphql_1.Field)(() => dispute_resolution_enum_1.DisputeResolution),
    (0, class_validator_1.IsEnum)(dispute_resolution_enum_1.DisputeResolution),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ResolveDisputeInput.prototype, "decision", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], ResolveDisputeInput.prototype, "adminNotes", void 0);
exports.ResolveDisputeInput = ResolveDisputeInput = __decorate([
    (0, graphql_1.InputType)()
], ResolveDisputeInput);
//# sourceMappingURL=resolve-dispute.input.js.map