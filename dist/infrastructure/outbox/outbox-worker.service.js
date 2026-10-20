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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OutboxWorkerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxWorkerService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const schedule_1 = require("@nestjs/schedule");
const outbox_event_schema_1 = require("./outbox-event.schema");
const rabbitmq_service_1 = require("../rabbitmq/rabbitmq.service");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const redis_constants_1 = require("../redis/redis.constants");
const OUTBOX_WORKER_LOCK_KEY = 'outbox:worker:lock';
const LOCK_TTL_SECONDS = 10;
let OutboxWorkerService = OutboxWorkerService_1 = class OutboxWorkerService {
    outboxModel;
    rabbitMQService;
    redis;
    logger = new common_1.Logger(OutboxWorkerService_1.name);
    constructor(outboxModel, rabbitMQService, redis) {
        this.outboxModel = outboxModel;
        this.rabbitMQService = rabbitMQService;
        this.redis = redis;
    }
    async dispatchPendingEvents() {
        let acquiredLock = false;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(OUTBOX_WORKER_LOCK_KEY, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX')
                .catch((err) => {
                this.logger.warn(`Redis OutboxWorker lock error: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            });
            if (!lockResult)
                return;
            acquiredLock = true;
            const pendingEvents = await this.outboxModel
                .find({ publishedAt: null })
                .limit(50)
                .lean()
                .exec();
            if (pendingEvents.length === 0)
                return;
            this.logger.debug(`Dispatching ${pendingEvents.length} outbox event(s)`);
            for (const event of pendingEvents) {
                try {
                    await this.rabbitMQService.publish(event.eventType, event.payload, event.correlationId, event.messageId);
                    await this.outboxModel.updateOne({ _id: event._id }, { $set: { publishedAt: new Date() } });
                }
                catch (err) {
                    this.logger.error(`Failed to dispatch outbox event [${event.eventType}] messageId=${event.messageId}: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`OutboxWorker batch error: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            if (acquiredLock) {
                await this.redis
                    .eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, OUTBOX_WORKER_LOCK_KEY, lockValue)
                    .catch(() => undefined);
            }
        }
    }
};
exports.OutboxWorkerService = OutboxWorkerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_SECOND),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OutboxWorkerService.prototype, "dispatchPendingEvents", null);
exports.OutboxWorkerService = OutboxWorkerService = OutboxWorkerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(outbox_event_schema_1.OutboxEvent.name)),
    __param(2, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        rabbitmq_service_1.RabbitMQService,
        ioredis_2.default])
], OutboxWorkerService);
//# sourceMappingURL=outbox-worker.service.js.map