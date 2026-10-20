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
exports.UpdateDisputeStatusInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const dispute_status_enum_1 = require("../enums/dispute-status.enum");
let UpdateDisputeStatusInput = class UpdateDisputeStatusInput {
    disputeId;
    status;
};
exports.UpdateDisputeStatusInput = UpdateDisputeStatusInput;
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, class_validator_1.IsMongoId)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateDisputeStatusInput.prototype, "disputeId", void 0);
__decorate([
    (0, graphql_1.Field)(() => dispute_status_enum_1.DisputeStatus),
    (0, class_validator_1.IsEnum)(dispute_status_enum_1.DisputeStatus),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateDisputeStatusInput.prototype, "status", void 0);
exports.UpdateDisputeStatusInput = UpdateDisputeStatusInput = __decorate([
    (0, graphql_1.InputType)()
], UpdateDisputeStatusInput);
//# sourceMappingURL=update-dispute-status.input.js.map