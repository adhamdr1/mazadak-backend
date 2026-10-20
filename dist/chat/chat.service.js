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
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const rabbitmq_service_1 = require("../infrastructure/rabbitmq/rabbitmq.service");
const realtime_service_1 = require("../infrastructure/pubsub/realtime.service");
const chat_message_type_enum_1 = require("./enums/chat-message-type.enum");
const chat_forbidden_exception_1 = require("./exceptions/chat-forbidden.exception");
const chat_not_allowed_exception_1 = require("./exceptions/chat-not-allowed.exception");
const chat_edit_timeout_exception_1 = require("./exceptions/chat-edit-timeout.exception");
const chat_message_not_found_exception_1 = require("./exceptions/chat-message-not-found.exception");
const auction_not_found_exception_1 = require("../auctions/exceptions/auction-not-found.exception");
const auction_status_enum_1 = require("../auctions/enums/auction-status.enum");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
let ChatService = ChatService_1 = class ChatService {
    chatRepository;
    auctionRepository;
    rabbitMQService;
    realtimeService;
    logger = new common_1.Logger(ChatService_1.name);
    constructor(chatRepository, auctionRepository, rabbitMQService, realtimeService) {
        this.chatRepository = chatRepository;
        this.auctionRepository = auctionRepository;
        this.rabbitMQService = rabbitMQService;
        this.realtimeService = realtimeService;
    }
    async validateChatAccess(userId, userRole, auctionId) {
        const auction = await this.auctionRepository.findById(auctionId);
        if (!auction) {
            throw new auction_not_found_exception_1.AuctionNotFoundException();
        }
        if (auction.status !== auction_status_enum_1.AuctionStatus.ENDED || !auction.winnerId) {
            throw new chat_not_allowed_exception_1.ChatNotAllowedException();
        }
        const isSeller = auction.sellerId.toString() === userId;
        const isWinner = auction.winnerId.toString() === userId;
        const isAdmin = userRole === user_role_enum_1.UserRole.ADMIN;
        if (!isSeller && !isWinner && !isAdmin) {
            throw new chat_forbidden_exception_1.ChatForbiddenException();
        }
        return auction;
    }
    async verifyChatAccess(userId, userRole, auctionId) {
        await this.validateChatAccess(userId, userRole, auctionId);
    }
    async sendMessage(senderId, senderName, userRole, input) {
        const auction = await this.validateChatAccess(senderId, userRole, input.auctionId);
        let message;
        try {
            message = await this.chatRepository.createMessage({
                clientMessageId: input.clientMessageId,
                auctionId: input.auctionId,
                senderId,
                senderName,
                content: input.content,
                type: input.type,
                mediaUrls: input.mediaUrls,
            });
        }
        catch (err) {
            const errorWithCode = err;
            if (errorWithCode && errorWithCode.code === 11000) {
                this.logger.log(`Duplicate clientMessageId detected: ${input.clientMessageId}. Returning existing message.`);
                const existing = await this.chatRepository.findByClientMessageId(input.auctionId, senderId, input.clientMessageId);
                if (existing) {
                    return existing;
                }
            }
            throw err;
        }
        void this.realtimeService.publishMessageSent(message);
        void this.notifyChatRoomUpdatedOnMessage(auction, senderId, message);
        void this.publishChatNotification(auction, senderId, message);
        return message;
    }
    async notifyChatRoomUpdatedOnMessage(auction, senderId, message) {
        const recipientId = senderId === auction.sellerId.toString()
            ? auction.winnerId?.toString()
            : auction.sellerId.toString();
        const auctionId = auction._id.toString();
        if (recipientId) {
            try {
                const [unreadCount, endedAuctionIds] = await Promise.all([
                    this.chatRepository.getUnreadCountForRoom(auctionId, recipientId),
                    this.auctionRepository.findEndedParticipantAuctionIds(recipientId),
                ]);
                const totalUnreadRooms = await this.chatRepository.getTotalUnreadRoomsCount(recipientId, endedAuctionIds);
                void this.realtimeService.publishChatRoomUpdated({
                    recipientId,
                    auctionId,
                    unreadCount,
                    totalUnreadRooms,
                    lastMessageAt: message.createdAt,
                    lastMessage: message,
                });
            }
            catch (err) {
                this.logger.error(`Failed to notify recipient of chat room update: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        try {
            const senderEndedAuctionIds = await this.auctionRepository.findEndedParticipantAuctionIds(senderId);
            const senderTotalUnreadRooms = await this.chatRepository.getTotalUnreadRoomsCount(senderId, senderEndedAuctionIds);
            void this.realtimeService.publishChatRoomUpdated({
                recipientId: senderId,
                auctionId,
                unreadCount: 0,
                totalUnreadRooms: senderTotalUnreadRooms,
                lastMessageAt: message.createdAt,
                lastMessage: message,
            });
        }
        catch (err) {
            this.logger.error(`Failed to notify sender of chat room update: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async publishChatNotification(auction, senderId, message) {
        try {
            const recipientId = senderId === auction.sellerId.toString()
                ? auction.winnerId?.toString()
                : auction.sellerId.toString();
            if (!recipientId) {
                throw new Error('Recipient ID not found');
            }
            await this.rabbitMQService.publish(rabbitmq_event_types_1.RabbitMQEvent.ChatMessageSent, {
                recipientId,
                auctionId: auction._id.toString(),
                auctionTitle: auction.title,
                senderId,
                messageType: message.type,
                preview: message.type === chat_message_type_enum_1.ChatMessageType.IMAGE
                    ? 'Image'
                    : message.content
                        ? message.content.substring(0, 50)
                        : '',
            });
        }
        catch (err) {
            this.logger.error(`Failed to publish chat notification to RabbitMQ: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async editMessage(userId, userRole, messageId, newContent) {
        const message = await this.chatRepository.findById(messageId);
        if (!message) {
            throw new chat_message_not_found_exception_1.ChatMessageNotFoundException();
        }
        if (message.senderId.toString() !== userId) {
            throw new chat_forbidden_exception_1.ChatForbiddenException();
        }
        await this.validateChatAccess(userId, userRole, message.auctionId.toString());
        const timeLimit = new Date(Date.now() - 15 * 60 * 1000);
        const updated = await this.chatRepository.updateMessageAtomically(messageId, userId, { content: newContent, isEdited: true }, timeLimit);
        if (!updated) {
            throw new chat_edit_timeout_exception_1.ChatEditTimeoutException();
        }
        void this.realtimeService.publishMessageUpdated(updated);
        return updated;
    }
    async deleteMessage(userId, userRole, messageId) {
        const message = await this.chatRepository.findById(messageId);
        if (!message) {
            throw new chat_message_not_found_exception_1.ChatMessageNotFoundException();
        }
        const isOwner = message.senderId.toString() === userId;
        const isAdmin = userRole === user_role_enum_1.UserRole.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new chat_forbidden_exception_1.ChatForbiddenException();
        }
        await this.validateChatAccess(userId, userRole, message.auctionId.toString());
        const timeLimit = isAdmin
            ? undefined
            : new Date(Date.now() - 15 * 60 * 1000);
        const updated = await this.chatRepository.updateMessageAtomically(messageId, message.senderId.toString(), { isDeleted: true }, timeLimit);
        if (!updated) {
            throw new chat_edit_timeout_exception_1.ChatEditTimeoutException();
        }
        void this.realtimeService.publishMessageUpdated(updated);
        return updated;
    }
    async reactToMessage(userId, userRole, messageId, emoji) {
        const message = await this.chatRepository.findById(messageId);
        if (!message) {
            throw new chat_message_not_found_exception_1.ChatMessageNotFoundException();
        }
        await this.validateChatAccess(userId, userRole, message.auctionId.toString());
        let updated;
        if (emoji) {
            updated = await this.chatRepository.addOrUpdateReaction(messageId, userId, emoji);
        }
        else {
            updated = await this.chatRepository.removeReaction(messageId, userId);
        }
        if (!updated) {
            throw new chat_message_not_found_exception_1.ChatMessageNotFoundException();
        }
        void this.realtimeService.publishMessageUpdated(updated);
        return updated;
    }
    async getChatMessages(userId, userRole, auctionId, limit, cursor) {
        await this.validateChatAccess(userId, userRole, auctionId);
        let parsedCursor;
        if (cursor) {
            const separatorIndex = cursor.lastIndexOf('_');
            if (separatorIndex !== -1) {
                parsedCursor = {
                    createdAt: new Date(cursor.substring(0, separatorIndex)),
                    _id: cursor.substring(separatorIndex + 1),
                };
            }
        }
        const safeLimit = Math.min(limit, 50);
        return await this.chatRepository.findByAuctionIdWithCursor(auctionId, safeLimit, parsedCursor);
    }
    async markChatAsRead(userId, userRole, auctionId, lastReadMessageId) {
        await this.validateChatAccess(userId, userRole, auctionId);
        const readState = await this.chatRepository.upsertReadState(auctionId, userId, lastReadMessageId);
        void this.realtimeService.publishChatReadStatusUpdated({
            auctionId,
            userId,
            lastReadMessageId: readState.lastReadMessageId?.toString() || null,
            lastReadAt: readState.lastReadAt,
        });
        void this.notifyChatRoomUpdatedOnRead(userId, auctionId);
        return true;
    }
    async notifyChatRoomUpdatedOnRead(userId, auctionId) {
        try {
            const [endedAuctionIds, latestMap] = await Promise.all([
                this.auctionRepository.findEndedParticipantAuctionIds(userId),
                this.chatRepository.getLatestMessagesForAuctions([
                    new mongoose_1.Types.ObjectId(auctionId),
                ]),
            ]);
            const totalUnreadRooms = await this.chatRepository.getTotalUnreadRoomsCount(userId, endedAuctionIds);
            const latestData = latestMap?.get(auctionId);
            if (latestData) {
                void this.realtimeService.publishChatRoomUpdated({
                    recipientId: userId,
                    auctionId,
                    unreadCount: 0,
                    totalUnreadRooms,
                    lastMessageAt: latestData.lastMessageAt,
                    lastMessage: latestData.lastMessage,
                });
            }
        }
        catch (err) {
            this.logger.error(`Failed to notify chat room read update: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async findReadState(userId, userRole, auctionId) {
        await this.validateChatAccess(userId, userRole, auctionId);
        return await this.chatRepository.findReadState(auctionId, userId);
    }
    async findReadStates(userId, userRole, auctionId) {
        await this.validateChatAccess(userId, userRole, auctionId);
        return await this.chatRepository.findReadStatesByAuction(auctionId);
    }
    async getMyChatRooms(userId, page = 1, limit = 10) {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const auctionIds = await this.auctionRepository.findEndedParticipantAuctionIds(userId);
        if (auctionIds.length === 0) {
            return { items: [], total: 0, totalPages: 0, hasNextPage: false };
        }
        const latestMessagesMap = await this.chatRepository.getLatestMessagesForAuctions(auctionIds);
        const withMessages = [];
        const withoutMessages = [];
        for (const id of auctionIds) {
            const data = latestMessagesMap.get(id.toString());
            if (data) {
                withMessages.push({ auctionId: id, ...data });
            }
            else {
                withoutMessages.push(id);
            }
        }
        withMessages.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime() ||
            b.auctionId.toString().localeCompare(a.auctionId.toString()));
        withoutMessages.sort((a, b) => b.toString().localeCompare(a.toString()));
        const total = withMessages.length + withoutMessages.length;
        const totalPages = Math.ceil(total / safeLimit);
        const skip = (safePage - 1) * safeLimit;
        const allOrderedIds = [
            ...withMessages.map((m) => m.auctionId),
            ...withoutMessages,
        ];
        const currentPageIds = allOrderedIds.slice(skip, skip + safeLimit);
        if (currentPageIds.length === 0) {
            return { items: [], total, totalPages, hasNextPage: false };
        }
        const [auctions, unreadCountsMap] = await Promise.all([
            this.auctionRepository.findByIds(currentPageIds),
            this.chatRepository.getUnreadCountsForAuctions(currentPageIds, userId),
        ]);
        const auctionMap = new Map(auctions.map((a) => [a._id.toString(), a]));
        const items = [];
        for (const auctionId of currentPageIds) {
            const auction = auctionMap.get(auctionId.toString());
            if (!auction)
                continue;
            const messageData = latestMessagesMap.get(auctionId.toString());
            items.push({
                auctionId,
                auction,
                lastMessage: messageData?.lastMessage ?? null,
                lastMessageAt: messageData?.lastMessageAt ?? null,
                unreadCount: unreadCountsMap.get(auctionId.toString()) ?? 0,
            });
        }
        return {
            items,
            total,
            totalPages,
            hasNextPage: safePage < totalPages,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IChatRepository')),
    __param(1, (0, common_1.Inject)('IAuctionRepository')),
    __metadata("design:paramtypes", [Object, Object, rabbitmq_service_1.RabbitMQService,
        realtime_service_1.RealtimeService])
], ChatService);
//# sourceMappingURL=chat.service.js.map