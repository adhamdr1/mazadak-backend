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
exports.MongoWebhookEventRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const webhook_event_entity_1 = require("../entities/webhook-event.entity");
let MongoWebhookEventRepository = class MongoWebhookEventRepository {
    webhookEventModel;
    constructor(webhookEventModel) {
        this.webhookEventModel = webhookEventModel;
    }
    async findOne(providerEventId, session) {
        return this.webhookEventModel
            .findOne({ providerEventId })
            .session(session || null)
            .exec();
    }
    async create(data, session) {
        const newEvent = new this.webhookEventModel(data);
        return newEvent.save({ session });
    }
    async save(webhookEvent, session) {
        const doc = webhookEvent;
        if (doc && typeof doc.save === 'function') {
            return doc.save({ session });
        }
        return this.webhookEventModel
            .findByIdAndUpdate(doc._id, doc, { returnDocument: 'after', session })
            .exec();
    }
};
exports.MongoWebhookEventRepository = MongoWebhookEventRepository;
exports.MongoWebhookEventRepository = MongoWebhookEventRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(webhook_event_entity_1.WebhookEvent.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoWebhookEventRepository);
//# sourceMappingURL=mongo.webhook-event.repository.js.map