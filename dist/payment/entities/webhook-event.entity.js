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
exports.WebhookEventSchema = exports.WebhookEvent = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const payment_provider_type_enum_1 = require("../enums/payment-provider-type.enum");
let WebhookEvent = class WebhookEvent {
    providerEventId;
    provider;
    payload;
    providerSignature;
    processed;
    processedAt;
    retryCount;
    errorMessage;
    receivedAt;
};
exports.WebhookEvent = WebhookEvent;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: { unique: true } }),
    __metadata("design:type", String)
], WebhookEvent.prototype, "providerEventId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: payment_provider_type_enum_1.PaymentProviderType, required: true }),
    __metadata("design:type", String)
], WebhookEvent.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "payload", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], WebhookEvent.prototype, "providerSignature", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], WebhookEvent.prototype, "processed", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "processedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], WebhookEvent.prototype, "retryCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WebhookEvent.prototype, "errorMessage", void 0);
exports.WebhookEvent = WebhookEvent = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'webhook_events',
        timestamps: { createdAt: 'receivedAt', updatedAt: false },
        versionKey: false,
    })
], WebhookEvent);
exports.WebhookEventSchema = mongoose_1.SchemaFactory.createForClass(WebhookEvent);
//# sourceMappingURL=webhook-event.entity.js.map