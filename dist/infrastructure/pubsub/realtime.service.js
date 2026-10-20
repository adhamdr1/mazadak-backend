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
var RealtimeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const common_1 = require("@nestjs/common");
const graphql_redis_subscriptions_1 = require("graphql-redis-subscriptions");
const pubsub_provider_1 = require("./pubsub.provider");
const events_constants_1 = require("./events.constants");
let RealtimeService = RealtimeService_1 = class RealtimeService {
    pubSub;
    logger = new common_1.Logger(RealtimeService_1.name);
    constructor(pubSub) {
        this.pubSub = pubSub;
    }
    async publishSafely(event, payload) {
        try {
            await this.pubSub.publish(event, payload);
        }
        catch (error) {
            this.logger.error(`Failed to publish event "${event}": ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async publishAuctionCreated(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.AUCTION_CREATED, {
            auctionCreated: payload,
        });
    }
    async publishBidAdded(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.BID_ADDED, {
            bidAdded: payload,
        });
    }
    async publishNotificationAdded(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.NOTIFICATION_ADDED, {
            notificationAdded: payload,
        });
    }
    async publishNotificationReadStatusUpdated(userId, payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.NOTIFICATION_READ_STATUS_UPDATED, {
            userId,
            notificationReadStatusUpdated: payload,
        });
    }
    async publishAuctionStatusChanged(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.AUCTION_STATUS_CHANGED, {
            auctionStatusChanged: payload,
        });
    }
    async publishMessageSent(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.MESSAGE_SENT, {
            messageSent: payload,
        });
    }
    async publishMessageUpdated(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.MESSAGE_UPDATED, {
            messageUpdated: payload,
        });
    }
    async publishChatReadStatusUpdated(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.CHAT_READ_STATUS_UPDATED, {
            chatReadStatusUpdated: payload,
        });
    }
    async publishChatRoomUpdated(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.CHAT_ROOM_UPDATED, {
            chatRoomUpdated: payload,
        });
    }
    async publishWalletUpdated(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.WALLET_UPDATED, {
            walletUpdated: payload,
        });
    }
    async publishWithdrawalRequested(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.WITHDRAWAL_REQUESTED, {
            adminWithdrawalFeed: payload,
            withdrawalRequested: payload,
        });
    }
    async publishWithdrawalStatusChanged(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.WITHDRAWAL_STATUS_CHANGED, {
            myWithdrawalUpdated: payload,
            adminWithdrawalFeed: payload,
            withdrawalStatusChanged: payload,
        });
    }
    async publishEscrowStatusChanged(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.ESCROW_STATUS_CHANGED, {
            escrowStatusChanged: payload,
        });
    }
    async publishDisputeStatusChanged(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.DISPUTE_STATUS_CHANGED, {
            disputeStatusChanged: payload,
        });
    }
    async publishReviewAddedToUser(payload) {
        await this.publishSafely(events_constants_1.PUB_SUB_EVENTS.REVIEW_ADDED_TO_USER, {
            reviewAddedToUser: payload,
        });
    }
};
exports.RealtimeService = RealtimeService;
exports.RealtimeService = RealtimeService = RealtimeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [graphql_redis_subscriptions_1.RedisPubSub])
], RealtimeService);
//# sourceMappingURL=realtime.service.js.map