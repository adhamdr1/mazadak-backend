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
var WebhookConsumer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookConsumer = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const amqpManager = __importStar(require("amqp-connection-manager"));
const rabbitmq_constants_1 = require("../../infrastructure/rabbitmq/rabbitmq.constants");
const rabbitmq_event_types_1 = require("../../infrastructure/rabbitmq/rabbitmq-event.types");
const payment_service_1 = require("../payment.service");
let WebhookConsumer = WebhookConsumer_1 = class WebhookConsumer {
    configService;
    paymentService;
    logger = new common_1.Logger(WebhookConsumer_1.name);
    connection = null;
    channelWrapper = null;
    constructor(configService, paymentService) {
        this.configService = configService;
        this.paymentService = paymentService;
    }
    onApplicationBootstrap() {
        const url = this.configService.getOrThrow('RABBITMQ_URL');
        this.connection = amqpManager.connect([url]);
        this.connection.on('connect', () => {
            this.logger.log('Connected to RabbitMQ (WebhookConsumer)!');
        });
        this.connection.on('disconnect', (err) => {
            this.logger.warn(`Disconnected from RabbitMQ (WebhookConsumer): ${err.err.message}. Reconnecting...`);
        });
        this.channelWrapper = this.connection.createChannel({
            setup: (channel) => {
                return Promise.all([
                    channel.prefetch(1),
                    channel.consume(rabbitmq_constants_1.PAYMENTS_WEBHOOK_QUEUE, (msg) => {
                        if (msg) {
                            this.handleMessage(msg, channel).catch((error) => {
                                this.logger.error(`Unhandled error in webhook consumer: ${error instanceof Error ? error.message : String(error)}`);
                            });
                        }
                    }, { noAck: false }),
                ]);
            },
        });
        this.logger.log('Started consuming PAYMENTS_WEBHOOK_QUEUE');
    }
    async handleMessage(msg, channel) {
        let parsedMessage;
        try {
            const content = msg.content.toString();
            const raw = JSON.parse(content);
            parsedMessage = (raw && typeof raw === 'object' && 'data' in raw
                ? raw.data
                : raw);
        }
        catch (parseError) {
            this.logger.error(`WebhookConsumer failed to parse message JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Rejecting to DLQ immediately.`);
            channel.reject(msg, false);
            return;
        }
        try {
            if (parsedMessage.eventType === rabbitmq_event_types_1.RabbitMQEvent.PaymentWebhookReceived) {
                await this.paymentService.processPaymentWebhookEvent(parsedMessage.payload);
            }
            channel.ack(msg);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to process webhook message: ${err.message}`, err.stack);
            this.handleProcessingError(msg, err, channel);
        }
    }
    handleProcessingError(msg, err, channel) {
        const headers = msg.properties.headers || {};
        const retryCount = (Number(headers[rabbitmq_constants_1.X_RETRY_COUNT]) || 0) + 1;
        let targetQueue = null;
        if (retryCount === 1) {
            targetQueue = rabbitmq_constants_1.WEBHOOK_RETRY_QUEUE_5S;
        }
        else if (retryCount === 2) {
            targetQueue = rabbitmq_constants_1.WEBHOOK_RETRY_QUEUE_30S;
        }
        else if (retryCount === 3) {
            targetQueue = rabbitmq_constants_1.WEBHOOK_RETRY_QUEUE_2M;
        }
        if (targetQueue) {
            this.logger.warn(`Webhook processing failed (attempt ${retryCount}). Re-queueing to ${targetQueue} for retry: ${err.message}`);
            channel.sendToQueue(targetQueue, msg.content, {
                headers: {
                    ...headers,
                    [rabbitmq_constants_1.X_RETRY_COUNT]: retryCount,
                },
            });
            channel.ack(msg);
        }
        else {
            this.logger.error(`Webhook processing failed after ${retryCount - 1} retries. Routing to Dead Letter Queue: ${err.message}`, err.stack);
            channel.nack(msg, false, false);
        }
    }
    async onModuleDestroy() {
        if (this.channelWrapper) {
            await this.channelWrapper.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
    }
};
exports.WebhookConsumer = WebhookConsumer;
exports.WebhookConsumer = WebhookConsumer = WebhookConsumer_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        payment_service_1.PaymentService])
], WebhookConsumer);
//# sourceMappingURL=webhook.consumer.js.map