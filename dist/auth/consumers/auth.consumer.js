"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthConsumer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthConsumer = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const amqpManager = __importStar(require("amqp-connection-manager"));
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const rabbitmq_constants_1 = require("../../infrastructure/rabbitmq/rabbitmq.constants");
const rabbitmq_event_types_1 = require("../../infrastructure/rabbitmq/rabbitmq-event.types");
let AuthConsumer = AuthConsumer_1 = class AuthConsumer {
    redis;
    authRepository;
    configService;
    logger = new common_1.Logger(AuthConsumer_1.name);
    connection = null;
    channelWrapper = null;
    queueName = rabbitmq_constants_1.AUTH_QUEUE;
    constructor(redis, authRepository, configService) {
        this.redis = redis;
        this.authRepository = authRepository;
        this.configService = configService;
    }
    onApplicationBootstrap() {
        const url = this.configService.getOrThrow('RABBITMQ_URL');
        this.connection = amqpManager.connect([url]);
        this.connection.on('connect', () => {
            this.logger.log('AuthConsumer connected to RabbitMQ!');
        });
        this.connection.on('disconnect', (params) => {
            this.logger.warn(`AuthConsumer disconnected from RabbitMQ: ${params.err.message}. Reconnecting...`);
        });
        this.channelWrapper = this.connection.createChannel({
            setup: (channel) => {
                return Promise.all([
                    channel.prefetch(10),
                    channel.consume(this.queueName, (msg) => {
                        if (msg) {
                            this.handleMessage(msg, channel).catch((error) => {
                                this.logger.error(`Unhandled error in AuthConsumer message: ${error instanceof Error ? error.message : String(error)}`);
                                this.handleProcessingError(msg, error, channel);
                            });
                        }
                    }, { noAck: false }),
                ]);
            },
        });
        this.logger.log(`AuthConsumer listening on ${this.queueName}`);
    }
    async onModuleDestroy() {
        if (this.channelWrapper) {
            await this.channelWrapper.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
    }
    async handleMessage(msg, channel) {
        let parsed;
        try {
            const content = msg.content.toString();
            const raw = JSON.parse(content);
            parsed = (raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw);
        }
        catch (parseError) {
            this.logger.error(`AuthConsumer failed to parse message JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Rejecting to DLQ immediately.`);
            channel.reject(msg, false);
            return;
        }
        try {
            if (!parsed) {
                this.logger.warn('AuthConsumer received empty or invalid message payload');
                channel.ack(msg);
                return;
            }
            const { messageId } = parsed;
            const idempotencyKey = `${rabbitmq_constants_1.IDEMPOTENCY_KEY_PREFIX}${messageId}`;
            const isDuplicate = await this.redis.get(idempotencyKey);
            if (isDuplicate) {
                this.logger.warn(`AuthConsumer detected duplicate message and skipped: ${messageId}`);
                channel.ack(msg);
                return;
            }
            this.logger.log(`AuthConsumer processing event ${parsed.eventType} (Msg: ${messageId})`);
            switch (parsed.eventType) {
                case rabbitmq_event_types_1.RabbitMQEvent.UserBanned:
                    await this.handleUserBanned(parsed.payload);
                    break;
                default:
                    this.logger.warn(`AuthConsumer received unhandled event type: ${parsed.eventType}`);
            }
            await this.redis.set(idempotencyKey, 'processed', 'EX', rabbitmq_constants_1.IDEMPOTENCY_TTL_S);
            channel.ack(msg);
            this.logger.log(`AuthConsumer successfully processed event ${parsed.eventType}`);
        }
        catch (error) {
            this.logger.error(`AuthConsumer error processing message: ${error instanceof Error ? error.message : String(error)}`);
            this.handleProcessingError(msg, error, channel);
        }
    }
    async handleUserBanned(payload) {
        this.logger.log(`Revoking all tokens for banned user: ${payload.userId}`);
        await this.authRepository.deleteAllUserTokens(payload.userId);
    }
    handleProcessingError(msg, err, channel) {
        const headers = msg.properties.headers || {};
        const retryCount = (Number(headers[rabbitmq_constants_1.X_RETRY_COUNT]) || 0) + 1;
        if (retryCount > 3) {
            this.logger.error(`AuthConsumer message exceeded max retries. Sending to dead-letter queue. Error: ${err.message}`);
            channel.reject(msg, false);
        }
        else {
            this.logger.warn(`AuthConsumer processing failed (attempt ${retryCount}). Retrying in 5 seconds...`);
            channel.ack(msg);
            channel.sendToQueue(rabbitmq_constants_1.AUTH_RETRY_QUEUE_5S, msg.content, {
                headers: {
                    ...headers,
                    [rabbitmq_constants_1.X_RETRY_COUNT]: retryCount,
                },
            });
        }
    }
};
exports.AuthConsumer = AuthConsumer;
exports.AuthConsumer = AuthConsumer = AuthConsumer_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __param(1, (0, common_1.Inject)('IAuthRepository')),
    __metadata("design:paramtypes", [ioredis_2.default, Object, config_1.ConfigService])
], AuthConsumer);
//# sourceMappingURL=auth.consumer.js.map