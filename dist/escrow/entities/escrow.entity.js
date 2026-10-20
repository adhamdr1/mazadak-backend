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
exports.EscrowSchema = exports.Escrow = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const escrow_status_enum_1 = require("../enums/escrow-status.enum");
let Escrow = class Escrow {
    _id;
    auctionId;
    buyerId;
    sellerId;
    amount;
    currency;
    status;
    inspectionPeriodEndsAt;
    inspectionDurationHours;
    releasedAt;
    refundedAt;
    disputeId;
    releaseReason;
    createdAt;
    updatedAt;
};
exports.Escrow = Escrow;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Escrow.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'Auction',
        required: true,
        unique: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Escrow.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Escrow.prototype, "buyerId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Escrow.prototype, "sellerId", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], Escrow.prototype, "amount", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({ type: String, required: true, default: 'EGP' }),
    __metadata("design:type", String)
], Escrow.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)(() => escrow_status_enum_1.EscrowStatus),
    (0, mongoose_1.Prop)({
        type: String,
        enum: escrow_status_enum_1.EscrowStatus,
        required: true,
        default: escrow_status_enum_1.EscrowStatus.HELD,
        index: true,
    }),
    __metadata("design:type", String)
], Escrow.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ type: Date, required: true, index: true }),
    __metadata("design:type", Date)
], Escrow.prototype, "inspectionPeriodEndsAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, {
        description: 'Total inspection window in hours (168 hours = 7 days)',
    }),
    __metadata("design:type", Number)
], Escrow.prototype, "inspectionDurationHours", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Escrow.prototype, "releasedAt", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Escrow.prototype, "refundedAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Dispute' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Escrow.prototype, "disputeId", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Escrow.prototype, "releaseReason", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Escrow.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Escrow.prototype, "updatedAt", void 0);
exports.Escrow = Escrow = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], Escrow);
exports.EscrowSchema = mongoose_1.SchemaFactory.createForClass(Escrow);
exports.EscrowSchema.index({ status: 1, inspectionPeriodEndsAt: 1 });
exports.EscrowSchema.index({ status: 1, createdAt: -1 });
exports.EscrowSchema.index({ createdAt: -1 });
exports.EscrowSchema.index({ buyerId: 1, status: 1 });
exports.EscrowSchema.index({ sellerId: 1, status: 1 });
//# sourceMappingURL=escrow.entity.js.map