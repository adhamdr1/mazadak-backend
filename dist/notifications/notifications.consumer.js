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
var NotificationsConsumer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsConsumer = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const amqpManager = __importStar(require("amqp-connection-manager"));
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const notifications_service_1 = require("./notifications.service");
const users_service_1 = require("../users/users.service");
const rabbitmq_constants_1 = require("../infrastructure/rabbitmq/rabbitmq.constants");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const in_app_notification_type_enum_1 = require("./in-app/enums/in-app-notification-type.enum");
const notification_reference_type_enum_1 = require("./in-app/enums/notification-reference-type.enum");
const in_app_notification_title_enum_1 = require("./enums/in-app-notification-title.enum");
let NotificationsConsumer = NotificationsConsumer_1 = class NotificationsConsumer {
    redis;
    notificationsService;
    usersService;
    configService;
    logger = new common_1.Logger(NotificationsConsumer_1.name);
    connection = null;
    channelWrapper = null;
    queueName = 'notifications.queue';
    constructor(redis, notificationsService, usersService, configService) {
        this.redis = redis;
        this.notificationsService = notificationsService;
        this.usersService = usersService;
        this.configService = configService;
    }
    onApplicationBootstrap() {
        const url = this.configService.getOrThrow('RABBITMQ_URL');
        this.connection = amqpManager.connect([url]);
        this.connection.on('connect', () => {
            this.logger.log('Connected to RabbitMQ!');
        });
        this.connection.on('disconnect', (params) => {
            this.logger.warn(`Disconnected from RabbitMQ: ${params.err.message}. Reconnecting...`);
        });
        this.channelWrapper = this.connection.createChannel({
            setup: (channel) => {
                return Promise.all([
                    channel.prefetch(10),
                    channel.consume(this.queueName, (msg) => {
                        if (msg) {
                            this.handleMessage(msg, channel).catch((error) => {
                                this.logger.error(`Unhandled error processing message: ${error instanceof Error ? error.message : String(error)}`);
                                this.handleProcessingError(msg, error, channel);
                            });
                        }
                    }, { noAck: false }),
                ]);
            },
        });
        this.logger.log(`NotificationsConsumer listening on ${this.queueName}`);
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
            this.logger.error(`NotificationsConsumer failed to parse message JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Rejecting to DLQ immediately.`);
            channel.reject(msg, false);
            return;
        }
        try {
            if (!parsed) {
                this.logger.warn('Received empty or invalid message payload');
                channel.ack(msg);
                return;
            }
            const { messageId } = parsed;
            const idempotencyKey = `${rabbitmq_constants_1.IDEMPOTENCY_KEY_PREFIX}${messageId}`;
            const isDuplicate = await this.redis.get(idempotencyKey);
            if (isDuplicate) {
                this.logger.warn(`Duplicate message detected and skipped: ${messageId}`);
                channel.ack(msg);
                return;
            }
            this.logger.log(`Processing event ${parsed.eventType} (Msg: ${messageId})`);
            switch (parsed.eventType) {
                case rabbitmq_event_types_1.RabbitMQEvent.AuctionStarted:
                    await this.handleAuctionStarted(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.AuctionEnded:
                    await this.handleAuctionEnded(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.BidPlaced:
                    await this.handleBidPlaced(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.AuctionCancelledByAdmin:
                    await this.handleAuctionCancelledByAdmin(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.UserRegistered:
                    await this.handleUserRegistered(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.EmailVerified:
                    await this.handleEmailVerified(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.PasswordReset:
                    await this.handlePasswordReset(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.PasswordChanged:
                    await this.handlePasswordChanged(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.WalletDeposited:
                    await this.handleWalletDeposited(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.WithdrawalRequested:
                    await this.handleWithdrawalRequested(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.WithdrawalCompleted:
                    await this.handleWithdrawalCompleted(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.WithdrawalRejected:
                    await this.handleWithdrawalRejected(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.AuctionCancelled:
                    await this.handleAuctionCancelled(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.AccountReactivationRequested:
                    await this.handleAccountReactivationRequested(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.AccountReactivated:
                    await this.handleAccountReactivated(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.ChatMessageSent:
                    await this.handleChatMessageSent(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.ReviewPublished:
                    await this.handleReviewPublished(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.ReviewReplied:
                    await this.handleReviewReplied(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.AutoBidPlaced:
                    await this.handleAutoBidPlaced(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.AutoBidExhausted:
                    await this.handleAutoBidExhausted(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.EscrowCreated:
                    await this.handleEscrowCreated(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.EscrowReleased:
                    await this.handleEscrowReleased(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.EscrowRefunded:
                    await this.handleEscrowRefunded(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.DisputeOpened:
                    await this.handleDisputeOpened(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.DisputeResolved:
                    await this.handleDisputeResolved(parsed.payload);
                    break;
                case rabbitmq_event_types_1.RabbitMQEvent.DisputeCancelled:
                    await this.handleDisputeCancelled(parsed.payload);
                    break;
                default: {
                    const unknownEvent = parsed.eventType;
                    this.logger.warn(`Unhandled event type in notifications consumer: ${String(unknownEvent)}`);
                }
            }
            await this.redis.set(idempotencyKey, 'processed', 'EX', rabbitmq_constants_1.IDEMPOTENCY_TTL_S);
            channel.ack(msg);
            this.logger.log(`Successfully processed event ${parsed.eventType}`);
        }
        catch (error) {
            this.logger.error(`Error processing message: ${error instanceof Error ? error.message : String(error)}`);
            this.handleProcessingError(msg, error, channel);
        }
    }
    handleProcessingError(msg, err, channel) {
        const headers = msg.properties.headers || {};
        const retryCount = (Number(headers[rabbitmq_constants_1.X_RETRY_COUNT]) || 0) + 1;
        let targetQueue = null;
        if (retryCount === 1) {
            targetQueue = rabbitmq_constants_1.NOTIFICATIONS_RETRY_QUEUE_5S;
        }
        else if (retryCount === 2) {
            targetQueue = rabbitmq_constants_1.NOTIFICATIONS_RETRY_QUEUE_30S;
        }
        else if (retryCount === 3) {
            targetQueue = rabbitmq_constants_1.NOTIFICATIONS_RETRY_QUEUE_2M;
        }
        if (targetQueue) {
            this.logger.warn(`Notification processing failed (attempt ${retryCount}). Re-queueing to ${targetQueue} for retry: ${err.message}`);
            channel.sendToQueue(targetQueue, msg.content, {
                headers: {
                    ...headers,
                    [rabbitmq_constants_1.X_RETRY_COUNT]: retryCount,
                },
            });
            channel.ack(msg);
        }
        else {
            this.logger.error(`Notification processing failed after ${retryCount - 1} retries. Routing to Dead Letter Queue: ${err.message}`, err.stack);
            channel.nack(msg, false, false);
        }
    }
    async handleAuctionStarted(payload) {
        const seller = await this.usersService.findByIdIncludingDeleted(payload.sellerId);
        if (!seller || seller.isBanned)
            return;
        const name = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
        await this.notificationsService.sendAuctionStartedSellerEmail(seller.email, name, payload.auctionTitle, payload.auctionId);
        await this.notificationsService.createInAppNotification({
            userId: payload.sellerId,
            type: in_app_notification_type_enum_1.InAppNotificationType.AUCTION_STARTED,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.AUCTION_LIVE,
            body: `Your auction "${payload.auctionTitle}" is now live and accepting bids.`,
            referenceId: payload.auctionId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
        });
    }
    async handleAuctionCancelled(payload) {
        const seller = await this.usersService.findByIdIncludingDeleted(payload.sellerId);
        if (seller && !seller.isBanned) {
            const name = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
            await this.notificationsService.sendAuctionCancelledEmail(seller.email, name, payload.auctionTitle, payload.auctionId);
            await this.notificationsService.createInAppNotification({
                userId: payload.sellerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.AUCTION_CANCELLED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.AUCTION_CANCELLED,
                body: `You have successfully cancelled your auction "${payload.auctionTitle}".`,
                referenceId: payload.auctionId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
            });
        }
        if (payload.highestBidderId && payload.refundAmount !== undefined) {
            const bidder = await this.usersService.findByIdIncludingDeleted(payload.highestBidderId);
            if (bidder && !bidder.isBanned) {
                const bidderName = [bidder.firstName, bidder.lastName].filter(Boolean).join(' ') ||
                    'User';
                await this.notificationsService.sendAuctionCancelledToBidderEmail(bidder.email, bidderName, payload.auctionTitle, payload.auctionId, 'The seller cancelled the auction.', payload.refundAmount);
                await this.notificationsService.createInAppNotification({
                    userId: payload.highestBidderId,
                    type: in_app_notification_type_enum_1.InAppNotificationType.AUCTION_CANCELLED,
                    title: in_app_notification_title_enum_1.InAppNotificationTitles.AUCTION_CANCELLED,
                    body: `The auction "${payload.auctionTitle}" has been cancelled and your held funds of ${payload.refundAmount} EGP have been released.`,
                    referenceId: payload.auctionId,
                    referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
                });
            }
        }
    }
    async handleAuctionCancelledByAdmin(payload) {
        const seller = await this.usersService.findByIdIncludingDeleted(payload.sellerId);
        if (seller && !seller.isBanned) {
            const name = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
            await this.notificationsService.sendAuctionCancelledByAdminEmail(seller.email, name, payload.auctionTitle, payload.auctionId, payload.adminActionReason);
            await this.notificationsService.createInAppNotification({
                userId: payload.sellerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.AUCTION_CANCELLED_BY_ADMIN,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.AUCTION_CANCELLED_BY_ADMIN,
                body: `Your auction "${payload.auctionTitle}" was cancelled by an admin. Reason: ${payload.adminActionReason}`,
                referenceId: payload.auctionId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
            });
        }
        if (payload.highestBidderId && payload.refundAmount !== undefined) {
            const bidder = await this.usersService.findByIdIncludingDeleted(payload.highestBidderId);
            if (bidder && !bidder.isBanned) {
                const bidderName = [bidder.firstName, bidder.lastName].filter(Boolean).join(' ') ||
                    'User';
                await this.notificationsService.sendAuctionCancelledToBidderEmail(bidder.email, bidderName, payload.auctionTitle, payload.auctionId, payload.adminActionReason, payload.refundAmount);
                await this.notificationsService.createInAppNotification({
                    userId: payload.highestBidderId,
                    type: in_app_notification_type_enum_1.InAppNotificationType.AUCTION_CANCELLED_BY_ADMIN,
                    title: in_app_notification_title_enum_1.InAppNotificationTitles.AUCTION_CANCELLED_BY_ADMIN,
                    body: `The auction "${payload.auctionTitle}" has been cancelled by an Admin and your held funds of ${payload.refundAmount} EGP have been released. Reason: ${payload.adminActionReason}`,
                    referenceId: payload.auctionId,
                    referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
                });
            }
        }
    }
    async handleAuctionEnded(payload) {
        let winnerName = 'Winning Bidder';
        const seller = await this.usersService.findByIdIncludingDeleted(payload.sellerId);
        if (payload.winnerId) {
            const winner = await this.usersService.findByIdIncludingDeleted(payload.winnerId);
            if (winner && !winner.isBanned) {
                winnerName =
                    [winner.firstName, winner.lastName].filter(Boolean).join(' ') ||
                        'Winning Bidder';
                await this.notificationsService.sendAuctionWonEmail(winner.email, winnerName, payload.auctionTitle, payload.finalPrice, payload.auctionId, payload.captureTransactionId);
                await this.notificationsService.createInAppNotification({
                    userId: payload.winnerId,
                    type: in_app_notification_type_enum_1.InAppNotificationType.AUCTION_WON,
                    title: in_app_notification_title_enum_1.InAppNotificationTitles.AUCTION_WON,
                    body: `You won the auction "${payload.auctionTitle}" with a final bid of ${payload.finalPrice} EGP.`,
                    referenceId: payload.auctionId,
                    referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
                });
            }
        }
        if (seller && !seller.isBanned) {
            const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
            await this.notificationsService.sendAuctionEndedSellerEmail(seller.email, sellerName, payload.auctionTitle, payload.finalPrice, payload.winnerId ? winnerName : null, payload.auctionId, payload.depositTransactionId);
            await this.notificationsService.createInAppNotification({
                userId: payload.sellerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.AUCTION_ENDED_SELLER,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.AUCTION_ENDED_SELLER,
                body: payload.winnerId
                    ? `Your auction "${payload.auctionTitle}" has successfully ended. Sold for ${payload.finalPrice} EGP to ${winnerName}.`
                    : `Your auction "${payload.auctionTitle}" has ended with no bids.`,
                referenceId: payload.auctionId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
            });
        }
    }
    async handleBidPlaced(payload) {
        if (await this.isUserEligibleForNotification(payload.sellerId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.sellerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.NEW_BID,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.NEW_BID,
                body: `Someone placed a bid of ${payload.amount} EGP on your auction "${payload.auctionTitle}".`,
                referenceId: payload.auctionId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
            });
        }
        if (!payload.outbidUserId)
            return;
        const previousBidder = await this.usersService.findByIdIncludingDeleted(payload.outbidUserId);
        if (previousBidder && !previousBidder.isBanned) {
            const name = [previousBidder.firstName, previousBidder.lastName]
                .filter(Boolean)
                .join(' ') || 'User';
            await this.notificationsService.sendOutbidEmail(previousBidder.email, name, payload.auctionTitle, payload.amount, payload.auctionId, payload.outbidTransactionId);
            await this.notificationsService.createInAppNotification({
                userId: payload.outbidUserId,
                type: in_app_notification_type_enum_1.InAppNotificationType.OUTBID,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.OUTBID,
                body: `Someone placed a higher bid of ${payload.amount} EGP on the auction "${payload.auctionTitle}".`,
                referenceId: payload.auctionId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
            });
        }
    }
    async handleUserRegistered(payload) {
        if (!(await this.isUserEligibleForNotification(payload.userId))) {
            this.logger.warn(`Skipping UserRegistered notification for ineligible user: ${payload.userId}`);
            return;
        }
        await this.notificationsService.sendEmailVerification(payload.email, payload.verificationToken, payload.name, payload.phone);
    }
    async handleEmailVerified(payload) {
        if (!(await this.isUserEligibleForNotification(payload.userId))) {
            this.logger.warn(`Skipping EmailVerified notification for ineligible user: ${payload.userId}`);
            return;
        }
        await this.notificationsService.sendWelcomeEmail(payload.email, payload.name);
        await this.notificationsService.createInAppNotification({
            userId: payload.userId,
            type: in_app_notification_type_enum_1.InAppNotificationType.WELCOME,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.WELCOME,
            body: 'Your account is now fully verified. Happy bidding!',
        });
    }
    async handlePasswordReset(payload) {
        const nameParts = payload.name.split(' ');
        await this.notificationsService.sendPasswordResetEmail(payload.email, payload.resetToken, { firstName: nameParts[0] || 'User', lastName: nameParts[1] }, payload.metadata);
    }
    async handlePasswordChanged(payload) {
        await this.notificationsService.sendPasswordChangedEmail(payload.email, payload.name, payload.date);
    }
    async handleWalletDeposited(payload) {
        const user = await this.usersService.findByIdIncludingDeleted(payload.userId);
        if (!user || user.isBanned)
            return;
        const email = user.email;
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        await this.notificationsService.sendDepositSuccessfulEmail(email, name, payload.amount, payload.transactionId);
        await this.notificationsService.createInAppNotification({
            userId: payload.userId,
            type: in_app_notification_type_enum_1.InAppNotificationType.DEPOSIT_SUCCESSFUL,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.DEPOSIT_SUCCESSFUL,
            body: `An amount of ${payload.amount} EGP has been credited to your wallet. Ref: ${payload.transactionId}.`,
            referenceId: payload.transactionId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.TRANSACTION,
        });
    }
    async handleWithdrawalRequested(payload) {
        const user = await this.usersService.findByIdIncludingDeleted(payload.userId);
        if (!user || user.isBanned)
            return;
        const email = user.email;
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        await this.notificationsService.sendWithdrawalRequestedEmail(email, name, payload);
    }
    async handleWithdrawalCompleted(payload) {
        const user = await this.usersService.findByIdIncludingDeleted(payload.userId);
        if (!user || user.isBanned)
            return;
        const email = user.email;
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        await this.notificationsService.sendWithdrawalCompletedEmail(email, name, payload.amount, payload.transactionId, {
            netAmount: payload.netAmount,
            payoutMethod: payload.payoutMethod,
            adminReference: payload.adminReference,
            receiptUrl: payload.receiptUrl,
            withdrawalId: payload.withdrawalId,
        });
        const refText = payload.adminReference
            ? ` (Ref: ${payload.adminReference})`
            : '';
        await this.notificationsService.createInAppNotification({
            userId: payload.userId,
            type: in_app_notification_type_enum_1.InAppNotificationType.WITHDRAWAL_COMPLETED,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.WITHDRAWAL_COMPLETED,
            body: `Your withdrawal of ${payload.amount} EGP has been successfully transferred${refText}.`,
            referenceId: payload.withdrawalId || payload.transactionId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.WITHDRAWAL,
        });
    }
    async handleWithdrawalRejected(payload) {
        const user = await this.usersService.findByIdIncludingDeleted(payload.userId);
        if (!user || user.isBanned)
            return;
        const email = user.email;
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        await this.notificationsService.sendWithdrawalRejectedEmail(email, name, payload);
        await this.notificationsService.createInAppNotification({
            userId: payload.userId,
            type: in_app_notification_type_enum_1.InAppNotificationType.WITHDRAWAL_REJECTED,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.WITHDRAWAL_REJECTED,
            body: `Your withdrawal request of ${payload.amount} EGP was rejected. Reason: ${payload.rejectionReason}. Funds have been restored to your wallet.`,
            referenceId: payload.withdrawalId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.WITHDRAWAL,
        });
    }
    async handleAccountReactivationRequested(payload) {
        await this.notificationsService.sendAccountReactivationEmail(payload.email, payload.verificationToken, payload.name);
    }
    async handleAccountReactivated(payload) {
        if (!(await this.isUserEligibleForNotification(payload.userId))) {
            this.logger.warn(`Skipping AccountReactivated notification for ineligible user: ${payload.userId}`);
            return;
        }
        await this.notificationsService.sendAccountReactivatedEmail(payload.email, payload.name);
        await this.notificationsService.createInAppNotification({
            userId: payload.userId,
            type: in_app_notification_type_enum_1.InAppNotificationType.WELCOME,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.WELCOME_BACK,
            body: 'Your account has been successfully reactivated.',
        });
    }
    async handleChatMessageSent(payload) {
        if (!(await this.isUserEligibleForNotification(payload.recipientId))) {
            this.logger.warn(`Skipping ChatMessageSent notification for ineligible user: ${payload.recipientId}`);
            return;
        }
        await this.notificationsService.createInAppNotification({
            userId: payload.recipientId,
            type: in_app_notification_type_enum_1.InAppNotificationType.NEW_CHAT_MESSAGE,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.NEW_CHAT_MESSAGE,
            body: payload.preview,
            referenceId: payload.auctionId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
        });
    }
    async handleReviewPublished(payload) {
        if (!(await this.isUserEligibleForNotification(payload.reviewedUserId))) {
            this.logger.warn(`Skipping ReviewPublished notification for ineligible user: ${payload.reviewedUserId}`);
            return;
        }
        await this.notificationsService.createInAppNotification({
            userId: payload.reviewedUserId,
            type: in_app_notification_type_enum_1.InAppNotificationType.REVIEW_RECEIVED,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.REVIEW_RECEIVED,
            body: `You received a new review with a rating of ${payload.overallRating} ⭐!`,
            referenceId: payload.reviewId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.REVIEW,
        });
    }
    async handleReviewReplied(payload) {
        if (!(await this.isUserEligibleForNotification(payload.reviewerId))) {
            this.logger.warn(`Skipping ReviewReplied notification for ineligible user: ${payload.reviewerId}`);
            return;
        }
        await this.notificationsService.createInAppNotification({
            userId: payload.reviewerId,
            type: in_app_notification_type_enum_1.InAppNotificationType.REVIEW_REPLIED,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.REVIEW_REPLIED,
            body: 'A new reply was posted to your review.',
            referenceId: payload.reviewId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.REVIEW,
        });
    }
    async handleAutoBidPlaced(payload) {
        if (!(await this.isUserEligibleForNotification(payload.bidderId))) {
            this.logger.warn(`Skipping AutoBidPlaced notification for ineligible user: ${payload.bidderId}`);
            return;
        }
        await this.notificationsService.createInAppNotification({
            userId: payload.bidderId,
            type: in_app_notification_type_enum_1.InAppNotificationType.AUTO_BID_PLACED,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.AUTO_BID_PLACED,
            body: `Your auto-bid placed a new bid of ${payload.amount} EGP on "${payload.auctionTitle}".`,
            referenceId: payload.auctionId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
        });
    }
    async handleAutoBidExhausted(payload) {
        const user = await this.usersService.findByIdIncludingDeleted(payload.userId);
        if (!user || user.isBanned) {
            this.logger.warn(`Skipping AutoBidExhausted notification for ineligible user: ${payload.userId}`);
            return;
        }
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        await this.notificationsService.sendAutoBidExhaustedEmail(user.email, name, payload.auctionTitle, payload.maxAmount, payload.currentPrice, payload.auctionId);
        await this.notificationsService.createInAppNotification({
            userId: payload.userId,
            type: in_app_notification_type_enum_1.InAppNotificationType.AUTO_BID_EXHAUSTED,
            title: in_app_notification_title_enum_1.InAppNotificationTitles.AUTO_BID_EXHAUSTED,
            body: `Your auto-bid limit of ${payload.maxAmount} EGP on "${payload.auctionTitle}" has been reached. Current price is ${payload.currentPrice} EGP.`,
            referenceId: payload.auctionId,
            referenceType: notification_reference_type_enum_1.NotificationReferenceType.AUCTION,
        });
    }
    async handleEscrowCreated(payload) {
        if (await this.isUserEligibleForNotification(payload.buyerId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.buyerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.ESCROW_CREATED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.ESCROW_CREATED,
                body: `Your payment of ${payload.amount} ${payload.currency} is securely held in escrow. You have 7 days to inspect the item.`,
                referenceId: payload.escrowId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.ESCROW,
            });
        }
        if (await this.isUserEligibleForNotification(payload.sellerId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.sellerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.ESCROW_CREATED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.ESCROW_CREATED,
                body: `Payment of ${payload.amount} ${payload.currency} for your auction is secured in escrow. Please deliver the item to the buyer.`,
                referenceId: payload.escrowId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.ESCROW,
            });
        }
    }
    async handleEscrowReleased(payload) {
        if (await this.isUserEligibleForNotification(payload.sellerId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.sellerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.ESCROW_RELEASED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.ESCROW_RELEASED,
                body: `Escrow funds of ${payload.amount} EGP have been released and deposited to your wallet!`,
                referenceId: payload.escrowId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.ESCROW,
            });
        }
        if (await this.isUserEligibleForNotification(payload.buyerId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.buyerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.ESCROW_RELEASED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.ESCROW_RELEASED,
                body: `Escrow payment of ${payload.amount} EGP has been released to the seller.`,
                referenceId: payload.escrowId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.ESCROW,
            });
        }
    }
    async handleEscrowRefunded(payload) {
        if (await this.isUserEligibleForNotification(payload.buyerId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.buyerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.ESCROW_REFUNDED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.ESCROW_REFUNDED,
                body: `Escrow payment of ${payload.amount} EGP has been refunded back to your wallet.`,
                referenceId: payload.escrowId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.ESCROW,
            });
        }
        if (await this.isUserEligibleForNotification(payload.sellerId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.sellerId,
                type: in_app_notification_type_enum_1.InAppNotificationType.ESCROW_REFUNDED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.ESCROW_REFUNDED,
                body: `Escrow for auction was refunded to the buyer.`,
                referenceId: payload.escrowId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.ESCROW,
            });
        }
    }
    async handleDisputeOpened(payload) {
        if (await this.isUserEligibleForNotification(payload.againstUserId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.againstUserId,
                type: in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_OPENED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.DISPUTE_OPENED,
                body: `A dispute has been opened regarding your auction transaction. Reason: ${payload.reason}.`,
                referenceId: payload.disputeId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.DISPUTE,
            });
        }
        if (await this.isUserEligibleForNotification(payload.openedById)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.openedById,
                type: in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_OPENED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.DISPUTE_OPENED,
                body: `Your dispute has been recorded and is currently under review by admin support.`,
                referenceId: payload.disputeId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.DISPUTE,
            });
        }
        const againstUser = await this.usersService.findByIdIncludingDeleted(payload.againstUserId);
        if (againstUser && !againstUser.isBanned && againstUser.email) {
            const name = [againstUser.firstName, againstUser.lastName]
                .filter(Boolean)
                .join(' ') || 'User';
            await this.notificationsService.sendDisputeOpenedEmail(againstUser.email, name, payload.disputeId, payload.reason, payload.auctionId);
        }
        if (payload.openedById !== payload.againstUserId) {
            const opener = await this.usersService.findByIdIncludingDeleted(payload.openedById);
            if (opener && !opener.isBanned && opener.email) {
                const name = [opener.firstName, opener.lastName].filter(Boolean).join(' ') ||
                    'User';
                await this.notificationsService.sendDisputeOpenedEmail(opener.email, name, payload.disputeId, payload.reason, payload.auctionId);
            }
        }
    }
    async handleDisputeResolved(payload) {
        const notifyBody = `The dispute has been resolved by admin: ${payload.decision}.`;
        if (await this.isUserEligibleForNotification(payload.openedById)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.openedById,
                type: in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_RESOLVED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.DISPUTE_RESOLVED,
                body: notifyBody,
                referenceId: payload.disputeId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.DISPUTE,
            });
        }
        if (await this.isUserEligibleForNotification(payload.againstUserId)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.againstUserId,
                type: in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_RESOLVED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.DISPUTE_RESOLVED,
                body: notifyBody,
                referenceId: payload.disputeId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.DISPUTE,
            });
        }
        const plaintiff = await this.usersService.findByIdIncludingDeleted(payload.openedById);
        if (plaintiff && !plaintiff.isBanned && plaintiff.email) {
            const name = [plaintiff.firstName, plaintiff.lastName].filter(Boolean).join(' ') ||
                'User';
            await this.notificationsService.sendDisputeResolvedEmail(plaintiff.email, name, payload.disputeId, payload.decision, payload.adminNotes);
        }
        if (payload.againstUserId !== payload.openedById) {
            const defendant = await this.usersService.findByIdIncludingDeleted(payload.againstUserId);
            if (defendant && !defendant.isBanned && defendant.email) {
                const name = [defendant.firstName, defendant.lastName].filter(Boolean).join(' ') ||
                    'User';
                await this.notificationsService.sendDisputeResolvedEmail(defendant.email, name, payload.disputeId, payload.decision, payload.adminNotes);
            }
        }
    }
    async handleDisputeCancelled(payload) {
        if (await this.isUserEligibleForNotification(payload.openedById)) {
            await this.notificationsService.createInAppNotification({
                userId: payload.openedById,
                type: in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_CANCELLED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.DISPUTE_CANCELLED,
                body: 'The dispute was successfully cancelled and escrow hold restored.',
                referenceId: payload.disputeId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.DISPUTE,
            });
        }
        if (payload.againstUserId !== payload.openedById &&
            (await this.isUserEligibleForNotification(payload.againstUserId))) {
            await this.notificationsService.createInAppNotification({
                userId: payload.againstUserId,
                type: in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_CANCELLED,
                title: in_app_notification_title_enum_1.InAppNotificationTitles.DISPUTE_CANCELLED,
                body: 'The dispute was cancelled and escrow hold restored.',
                referenceId: payload.disputeId,
                referenceType: notification_reference_type_enum_1.NotificationReferenceType.DISPUTE,
            });
        }
    }
    async isUserEligibleForNotification(userId) {
        const user = await this.usersService.findByIdIncludingDeleted(userId);
        if (!user)
            return false;
        if (user.isBanned)
            return false;
        return true;
    }
};
exports.NotificationsConsumer = NotificationsConsumer;
exports.NotificationsConsumer = NotificationsConsumer = NotificationsConsumer_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.default,
        notifications_service_1.NotificationsService,
        users_service_1.UsersService,
        config_1.ConfigService])
], NotificationsConsumer);
//# sourceMappingURL=notifications.consumer.js.map