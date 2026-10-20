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
exports.EscrowStatusChangedPayload = void 0;
const graphql_1 = require("@nestjs/graphql");
const escrow_status_enum_1 = require("../enums/escrow-status.enum");
let EscrowStatusChangedPayload = class EscrowStatusChangedPayload {
    escrowId;
    auctionId;
    status;
    releasedAt;
    refundedAt;
    disputeId;
    releaseReason;
};
exports.EscrowStatusChangedPayload = EscrowStatusChangedPayload;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], EscrowStatusChangedPayload.prototype, "escrowId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], EscrowStatusChangedPayload.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => escrow_status_enum_1.EscrowStatus),
    __metadata("design:type", String)
], EscrowStatusChangedPayload.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], EscrowStatusChangedPayload.prototype, "releasedAt", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], EscrowStatusChangedPayload.prototype, "refundedAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    __metadata("design:type", String)
], EscrowStatusChangedPayload.prototype, "disputeId", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], EscrowStatusChangedPayload.prototype, "releaseReason", void 0);
exports.EscrowStatusChangedPayload = EscrowStatusChangedPayload = __decorate([
    (0, graphql_1.ObjectType)()
], EscrowStatusChangedPayload);
//# sourceMappingURL=escrow-status-changed.payload.js.map