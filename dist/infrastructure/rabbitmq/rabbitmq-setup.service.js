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
var RabbitMQSetupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQSetupService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const amqpManager = __importStar(require("amqp-connection-manager"));
const rabbitmq_event_types_1 = require("./rabbitmq-event.types");
const rabbitmq_constants_1 = require("./rabbitmq.constants");
let RabbitMQSetupService = RabbitMQSetupService_1 = class RabbitMQSetupService {
    configService;
    logger = new common_1.Logger(RabbitMQSetupService_1.name);
    connection = null;
    channelWrapper = null;
    constructor(configService) {
        this.configService = configService;
    }
    async onApplicationBootstrap() {
        const url = this.configService.getOrThrow('RABBITMQ_URL');
        try {
            this.connection = amqpManager.connect([url]);
            this.connection.on('connect', () => {
                this.logger.log('RabbitMQSetupService connected — topology will be asserted');
            });
            this.connection.on('disconnect', (params) => {
                this.logger.warn(`RabbitMQSetupService disconnected: ${params.err.message}. Will re-assert topology on reconnect.`);
            });
            this.channelWrapper = this.connection.createChannel({
                setup: async (channel) => {
                    await this.assertTopology(channel);
                    this.logger.log('RabbitMQ topology asserted successfully');
                },
            });
            await this.channelWrapper.waitForConnect().catch((err) => {
                this.logger.warn(`Initial RabbitMQ connection pending/failed: ${err instanceof Error ? err.message : String(err)}. Connection manager will retry in background.`);
            });
        }
        catch (err) {
            this.logger.error(`RabbitMQ setup bootstrap error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async assertTopology(channel) {
        await channel.assertExchange(rabbitmq_constants_1.MAZADAK_EXCHANGE, 'topic', {
            durable: true,
        });
        await channel.assertQueue(rabbitmq_constants_1.DEAD_LETTER_QUEUE, {
            durable: true,
        });
        const queueRetryConfigs = [
            {
                queue: rabbitmq_constants_1.WALLET_RETRY_QUEUE_5S,
                ttl: 5_000,
                dlk: rabbitmq_event_types_1.RabbitMQEvent.WalletDepositInitiated,
            },
            {
                queue: rabbitmq_constants_1.AUTH_RETRY_QUEUE_5S,
                ttl: 5_000,
                dlk: rabbitmq_event_types_1.RabbitMQEvent.UserBanned,
            },
            {
                queue: rabbitmq_constants_1.WEBHOOK_RETRY_QUEUE_5S,
                ttl: 5_000,
                dlk: rabbitmq_event_types_1.RabbitMQEvent.PaymentWebhookReceived,
            },
            {
                queue: rabbitmq_constants_1.WEBHOOK_RETRY_QUEUE_30S,
                ttl: 30_000,
                dlk: rabbitmq_event_types_1.RabbitMQEvent.PaymentWebhookReceived,
            },
            {
                queue: rabbitmq_constants_1.WEBHOOK_RETRY_QUEUE_2M,
                ttl: 120_000,
                dlk: rabbitmq_event_types_1.RabbitMQEvent.PaymentWebhookReceived,
            },
            {
                queue: rabbitmq_constants_1.NOTIFICATIONS_RETRY_QUEUE_5S,
                ttl: 5_000,
                dlk: rabbitmq_constants_1.NOTIFICATIONS_RETRY_ROUTING_KEY,
            },
            {
                queue: rabbitmq_constants_1.NOTIFICATIONS_RETRY_QUEUE_30S,
                ttl: 30_000,
                dlk: rabbitmq_constants_1.NOTIFICATIONS_RETRY_ROUTING_KEY,
            },
            {
                queue: rabbitmq_constants_1.NOTIFICATIONS_RETRY_QUEUE_2M,
                ttl: 120_000,
                dlk: rabbitmq_constants_1.NOTIFICATIONS_RETRY_ROUTING_KEY,
            },
            {
                queue: rabbitmq_constants_1.AUCTION_RETRY_QUEUE_5S,
                ttl: 5_000,
                dlk: rabbitmq_constants_1.AUCTION_RETRY_ROUTING_KEY,
            },
        ];
        for (const config of queueRetryConfigs) {
            await channel.assertQueue(config.queue, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': rabbitmq_constants_1.MAZADAK_EXCHANGE,
                    'x-dead-letter-routing-key': config.dlk,
                    'x-message-ttl': config.ttl,
                },
            });
        }
        await channel.assertQueue(rabbitmq_constants_1.NOTIFICATIONS_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': rabbitmq_constants_1.DEAD_LETTER_QUEUE,
            },
        });
        await channel
            .unbindQueue(rabbitmq_constants_1.NOTIFICATIONS_QUEUE, rabbitmq_constants_1.MAZADAK_EXCHANGE, '#')
            .catch(() => undefined);
        const notificationRoutingKeys = [
            rabbitmq_event_types_1.RabbitMQEvent.AuctionStarted,
            rabbitmq_event_types_1.RabbitMQEvent.AuctionEnded,
            rabbitmq_event_types_1.RabbitMQEvent.BidPlaced,
            rabbitmq_event_types_1.RabbitMQEvent.AutoBidPlaced,
            rabbitmq_event_types_1.RabbitMQEvent.AutoBidExhausted,
            rabbitmq_event_types_1.RabbitMQEvent.AuctionCancelledByAdmin,
            rabbitmq_event_types_1.RabbitMQEvent.AuctionCancelled,
            rabbitmq_event_types_1.RabbitMQEvent.UserRegistered,
            rabbitmq_event_types_1.RabbitMQEvent.EmailVerified,
            rabbitmq_event_types_1.RabbitMQEvent.PasswordReset,
            rabbitmq_event_types_1.RabbitMQEvent.PasswordChanged,
            rabbitmq_event_types_1.RabbitMQEvent.WalletDeposited,
            rabbitmq_event_types_1.RabbitMQEvent.WithdrawalCompleted,
            rabbitmq_event_types_1.RabbitMQEvent.WithdrawalRequested,
            rabbitmq_event_types_1.RabbitMQEvent.WithdrawalRejected,
            rabbitmq_event_types_1.RabbitMQEvent.AccountReactivationRequested,
            rabbitmq_event_types_1.RabbitMQEvent.AccountReactivated,
            rabbitmq_event_types_1.RabbitMQEvent.ChatMessageSent,
            rabbitmq_event_types_1.RabbitMQEvent.ReviewPublished,
            rabbitmq_event_types_1.RabbitMQEvent.ReviewReplied,
            rabbitmq_event_types_1.RabbitMQEvent.EscrowCreated,
            rabbitmq_event_types_1.RabbitMQEvent.EscrowReleased,
            rabbitmq_event_types_1.RabbitMQEvent.EscrowRefunded,
            rabbitmq_event_types_1.RabbitMQEvent.DisputeOpened,
            rabbitmq_event_types_1.RabbitMQEvent.DisputeResolved,
            rabbitmq_event_types_1.RabbitMQEvent.DisputeCancelled,
            rabbitmq_constants_1.NOTIFICATIONS_RETRY_ROUTING_KEY,
        ];
        for (const routingKey of notificationRoutingKeys) {
            await channel.bindQueue(rabbitmq_constants_1.NOTIFICATIONS_QUEUE, rabbitmq_constants_1.MAZADAK_EXCHANGE, routingKey);
        }
        await channel.assertQueue(rabbitmq_constants_1.PAYMENTS_WEBHOOK_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': rabbitmq_constants_1.DEAD_LETTER_QUEUE,
            },
        });
        await channel.bindQueue(rabbitmq_constants_1.PAYMENTS_WEBHOOK_QUEUE, rabbitmq_constants_1.MAZADAK_EXCHANGE, rabbitmq_event_types_1.RabbitMQEvent.PaymentWebhookReceived);
        await channel.assertQueue(rabbitmq_constants_1.AUTH_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': rabbitmq_constants_1.DEAD_LETTER_QUEUE,
            },
        });
        await channel.bindQueue(rabbitmq_constants_1.AUTH_QUEUE, rabbitmq_constants_1.MAZADAK_EXCHANGE, rabbitmq_event_types_1.RabbitMQEvent.UserBanned);
        await channel.assertQueue(rabbitmq_constants_1.WALLET_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': rabbitmq_constants_1.DEAD_LETTER_QUEUE,
            },
        });
        await channel.bindQueue(rabbitmq_constants_1.WALLET_QUEUE, rabbitmq_constants_1.MAZADAK_EXCHANGE, rabbitmq_event_types_1.RabbitMQEvent.WalletDepositInitiated);
        await channel.assertQueue(rabbitmq_constants_1.AUCTION_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': rabbitmq_constants_1.DEAD_LETTER_QUEUE,
            },
        });
        await channel.bindQueue(rabbitmq_constants_1.AUCTION_QUEUE, rabbitmq_constants_1.MAZADAK_EXCHANGE, rabbitmq_event_types_1.RabbitMQEvent.UserBanned);
        await channel.bindQueue(rabbitmq_constants_1.AUCTION_QUEUE, rabbitmq_constants_1.MAZADAK_EXCHANGE, rabbitmq_event_types_1.RabbitMQEvent.UserSoftDeleted);
        await channel.bindQueue(rabbitmq_constants_1.AUCTION_QUEUE, rabbitmq_constants_1.MAZADAK_EXCHANGE, rabbitmq_constants_1.AUCTION_RETRY_ROUTING_KEY);
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
exports.RabbitMQSetupService = RabbitMQSetupService;
exports.RabbitMQSetupService = RabbitMQSetupService = RabbitMQSetupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RabbitMQSetupService);
//# sourceMappingURL=rabbitmq-setup.service.js.map