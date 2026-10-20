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
exports.OutboxEventSchema = exports.OutboxEvent = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const rabbitmq_event_types_1 = require("../rabbitmq/rabbitmq-event.types");
let OutboxEvent = class OutboxEvent {
    messageId;
    eventType;
    version;
    payload;
    correlationId;
    publishedAt;
    createdAt;
};
exports.OutboxEvent = OutboxEvent;
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        default: () => (0, crypto_1.randomUUID)(),
        unique: true,
        index: true,
    }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "messageId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, enum: rabbitmq_event_types_1.RabbitMQEvent }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "eventType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'v1' }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "version", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "payload", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "correlationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "publishedAt", void 0);
exports.OutboxEvent = OutboxEvent = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'outbox_events',
        timestamps: { createdAt: 'createdAt', updatedAt: false },
    })
], OutboxEvent);
exports.OutboxEventSchema = mongoose_1.SchemaFactory.createForClass(OutboxEvent);
exports.OutboxEventSchema.index({ publishedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
//# sourceMappingURL=outbox-event.schema.js.map