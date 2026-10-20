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
exports.TransactionSchema = exports.Transaction = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const transaction_type_enum_1 = require("../enums/transaction-type.enum");
const transaction_status_enum_1 = require("../enums/transaction-status.enum");
const transaction_reference_type_enum_1 = require("../enums/transaction-reference-type.enum");
let Transaction = class Transaction {
    _id;
    walletId;
    type;
    amount;
    currency;
    status;
    referenceId;
    idempotencyKey;
    gatewayPaymentIntentId;
    gatewayTransactionId;
    gatewayProvider;
    referenceType;
    expiresAt;
    hasChild;
    walletCredited;
    createdAt;
};
exports.Transaction = Transaction;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Transaction.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'Wallet',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Transaction.prototype, "walletId", void 0);
__decorate([
    (0, graphql_1.Field)(() => transaction_type_enum_1.TransactionType),
    (0, mongoose_1.Prop)({ type: String, enum: transaction_type_enum_1.TransactionType, required: true }),
    __metadata("design:type", String)
], Transaction.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.Decimal128,
        required: true,
        min: 0,
        get: (val) => (val ? val.toString() : '0.00'),
    }),
    __metadata("design:type", mongoose_2.Types.Decimal128)
], Transaction.prototype, "amount", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    (0, mongoose_1.Prop)({ type: String, required: true, uppercase: true, default: 'EGP' }),
    __metadata("design:type", String)
], Transaction.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)(() => transaction_status_enum_1.TransactionStatus),
    (0, mongoose_1.Prop)({
        type: String,
        enum: transaction_status_enum_1.TransactionStatus,
    }),
    __metadata("design:type", String)
], Transaction.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Transaction.prototype, "referenceId", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Transaction.prototype, "idempotencyKey", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Transaction.prototype, "gatewayPaymentIntentId", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], Transaction.prototype, "gatewayTransactionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Transaction.prototype, "gatewayProvider", void 0);
__decorate([
    (0, graphql_1.Field)(() => transaction_reference_type_enum_1.TransactionReferenceType, { nullable: true }),
    (0, mongoose_1.Prop)({ type: String, enum: transaction_reference_type_enum_1.TransactionReferenceType, default: null }),
    __metadata("design:type", Object)
], Transaction.prototype, "referenceType", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date, { nullable: true }),
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Transaction.prototype, "expiresAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { defaultValue: false }),
    (0, mongoose_1.Prop)({ type: Boolean, default: false, index: true }),
    __metadata("design:type", Boolean)
], Transaction.prototype, "hasChild", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { defaultValue: false }),
    (0, mongoose_1.Prop)({ type: Boolean, default: false, index: true }),
    __metadata("design:type", Boolean)
], Transaction.prototype, "walletCredited", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Transaction.prototype, "createdAt", void 0);
exports.Transaction = Transaction = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], Transaction);
exports.TransactionSchema = mongoose_1.SchemaFactory.createForClass(Transaction);
exports.TransactionSchema.index({ gatewayPaymentIntentId: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { gatewayPaymentIntentId: { $type: 'string' } },
});
exports.TransactionSchema.index({ idempotencyKey: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
});
exports.TransactionSchema.index({ walletId: 1, createdAt: -1 });
exports.TransactionSchema.index({ status: 1, type: 1, hasChild: 1 });
//# sourceMappingURL=transaction.entity.js.map