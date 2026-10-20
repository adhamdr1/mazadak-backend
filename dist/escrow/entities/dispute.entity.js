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
exports.DisputeSchema = exports.Dispute = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const dispute_status_enum_1 = require("../enums/dispute-status.enum");
const dispute_reason_enum_1 = require("../enums/dispute-reason.enum");
const dispute_resolution_enum_1 = require("../enums/dispute-resolution.enum");
let Dispute = class Dispute {
    _id;
    escrowId;
    auctionId;
    openedById;
    againstUserId;
    reason;
    description;
    evidenceUrls;
    status;
    adminId;
    adminDecision;
    adminNotes;
    resolvedAt;
    createdAt;
    updatedAt;
};
exports.Dispute = Dispute;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Dispute.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Escrow', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Dispute.prototype, "escrowId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Auction', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Dispute.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Dispute.prototype, "openedById", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Dispute.prototype, "againstUserId", void 0);
__decorate([
    (0, graphql_1.Field)(() => dispute_reason_enum_1.DisputeReason),
    (0, mongoose_1.Prop)({ type: String, enum: dispute_reason_enum_1.DisputeReason, required: true }),
    __metadata("design:type", String)
], Dispute.prototype, "reason", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], Dispute.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String]),
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Dispute.prototype, "evidenceUrls", void 0);
__decorate([
    (0, graphql_1.Field)(() => dispute_status_enum_1.DisputeStatus),
    (0, mongoose_1.Prop)({
        type: String,
        enum: dispute_status_enum_1.DisputeStatus,
        required: true,
        default: dispute_status_enum_1.DisputeStatus.OPEN,
        index: true,
    }),
    __metadata("design:type", String)
], Dispute.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Dispute.prototype, "adminId", void 0);
__decorate([
    (0, graphql_1.Field)(() => dispute_resolution_enum_1.DisputeResolution, { nullable: true }),
    (0, mongoose_1.Prop)({ type: String, enum: dispute_resolution_enum_1.DisputeResolution }),
    __metadata("design:type", String)
], Dispute.prototype, "adminDecision", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Dispute.prototype, "adminNotes", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Dispute.prototype, "resolvedAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Dispute.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Dispute.prototype, "updatedAt", void 0);
exports.Dispute = Dispute = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], Dispute);
exports.DisputeSchema = mongoose_1.SchemaFactory.createForClass(Dispute);
exports.DisputeSchema.index({ auctionId: 1, status: 1 });
exports.DisputeSchema.index({ openedById: 1, status: 1 });
exports.DisputeSchema.index({ againstUserId: 1, status: 1 });
exports.DisputeSchema.index({ status: 1, createdAt: -1 });
exports.DisputeSchema.index({ createdAt: -1 });
//# sourceMappingURL=dispute.entity.js.map