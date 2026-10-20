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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const outbox_event_schema_1 = require("./outbox-event.schema");
let OutboxService = class OutboxService {
    outboxModel;
    constructor(outboxModel) {
        this.outboxModel = outboxModel;
    }
    async saveEvent(eventType, payload, session, correlationId) {
        await this.outboxModel.create([
            {
                messageId: (0, crypto_1.randomUUID)(),
                eventType,
                payload: payload,
                correlationId: correlationId ?? (0, crypto_1.randomUUID)(),
                publishedAt: null,
            },
        ], session ? { session } : undefined);
    }
};
exports.OutboxService = OutboxService;
exports.OutboxService = OutboxService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(outbox_event_schema_1.OutboxEvent.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], OutboxService);
//# sourceMappingURL=outbox.service.js.map