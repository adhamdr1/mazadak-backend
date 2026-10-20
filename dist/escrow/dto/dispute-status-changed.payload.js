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
exports.DisputeStatusChangedPayload = void 0;
const graphql_1 = require("@nestjs/graphql");
const dispute_status_enum_1 = require("../enums/dispute-status.enum");
const dispute_resolution_enum_1 = require("../enums/dispute-resolution.enum");
let DisputeStatusChangedPayload = class DisputeStatusChangedPayload {
    disputeId;
    escrowId;
    auctionId;
    status;
    adminDecision;
    adminNotes;
    resolvedAt;
};
exports.DisputeStatusChangedPayload = DisputeStatusChangedPayload;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], DisputeStatusChangedPayload.prototype, "disputeId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], DisputeStatusChangedPayload.prototype, "escrowId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], DisputeStatusChangedPayload.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => dispute_status_enum_1.DisputeStatus),
    __metadata("design:type", String)
], DisputeStatusChangedPayload.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => dispute_resolution_enum_1.DisputeResolution, { nullable: true }),
    __metadata("design:type", String)
], DisputeStatusChangedPayload.prototype, "adminDecision", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], DisputeStatusChangedPayload.prototype, "adminNotes", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], DisputeStatusChangedPayload.prototype, "resolvedAt", void 0);
exports.DisputeStatusChangedPayload = DisputeStatusChangedPayload = __decorate([
    (0, graphql_1.ObjectType)()
], DisputeStatusChangedPayload);
//# sourceMappingURL=dispute-status-changed.payload.js.map