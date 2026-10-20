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
exports.WithdrawalRequestSchema = exports.WithdrawalRequest = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const withdrawal_status_enum_1 = require("../enums/withdrawal-status.enum");
const payout_method_enum_1 = require("../enums/payout-method.enum");
const payout_details_type_1 = require("../dto/payout-details.type");
let WithdrawalRequest = class WithdrawalRequest {
    _id;
    userId;
    amount;
    fee;
    feePercentage;
    netAmount;
    currency;
    payoutMethod;
    payoutDetails;
    status;
    holdTransactionId;
    completionTransactionId;
    adminReference;
    receiptUrl;
    rejectionReason;
    processedBy;
    processedAt;
    completedAt;
    requestDate;
    createdAt;
    updatedAt;
};
exports.WithdrawalRequest = WithdrawalRequest;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], WithdrawalRequest.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], WithdrawalRequest.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], WithdrawalRequest.prototype, "amount", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], WithdrawalRequest.prototype, "fee", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, mongoose_1.Prop)({ type: Number, required: true, default: 2 }),
    __metadata("design:type", Number)
], WithdrawalRequest.prototype, "feePercentage", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], WithdrawalRequest.prototype, "netAmount", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({ type: String, required: true, default: 'EGP' }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)(() => payout_method_enum_1.PayoutMethod),
    (0, mongoose_1.Prop)({
        type: String,
        enum: payout_method_enum_1.PayoutMethod,
        required: true,
        index: true,
    }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "payoutMethod", void 0);
__decorate([
    (0, graphql_1.Field)(() => payout_details_type_1.PayoutDetails),
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", payout_details_type_1.PayoutDetails)
], WithdrawalRequest.prototype, "payoutDetails", void 0);
__decorate([
    (0, graphql_1.Field)(() => withdrawal_status_enum_1.WithdrawalStatus),
    (0, mongoose_1.Prop)({
        type: String,
        enum: withdrawal_status_enum_1.WithdrawalStatus,
        required: true,
        default: withdrawal_status_enum_1.WithdrawalStatus.PENDING,
        index: true,
    }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Transaction' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], WithdrawalRequest.prototype, "holdTransactionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Transaction' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], WithdrawalRequest.prototype, "completionTransactionId", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "adminReference", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "receiptUrl", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "rejectionReason", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], WithdrawalRequest.prototype, "processedBy", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], WithdrawalRequest.prototype, "processedAt", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], WithdrawalRequest.prototype, "completedAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "requestDate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], WithdrawalRequest.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], WithdrawalRequest.prototype, "updatedAt", void 0);
exports.WithdrawalRequest = WithdrawalRequest = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], WithdrawalRequest);
exports.WithdrawalRequestSchema = mongoose_1.SchemaFactory.createForClass(WithdrawalRequest);
exports.WithdrawalRequestSchema.index({ userId: 1, status: 1 });
exports.WithdrawalRequestSchema.index({ userId: 1, createdAt: -1 });
exports.WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });
exports.WithdrawalRequestSchema.index({ userId: 1, requestDate: 1 }, {
    unique: true,
    partialFilterExpression: {
        status: {
            $in: [
                withdrawal_status_enum_1.WithdrawalStatus.PENDING,
                withdrawal_status_enum_1.WithdrawalStatus.PROCESSING,
                withdrawal_status_enum_1.WithdrawalStatus.COMPLETED,
            ],
        },
    },
    name: 'unique_daily_withdrawal_per_user',
});
//# sourceMappingURL=withdrawal-request.entity.js.map