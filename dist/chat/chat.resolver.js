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
exports.ChatResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const pubsub_provider_1 = require("../infrastructure/pubsub/pubsub.provider");
const events_constants_1 = require("../infrastructure/pubsub/events.constants");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const chat_read_state_entity_1 = require("./entities/chat-read-state.entity");
const chat_service_1 = require("./chat.service");
const create_chat_message_input_1 = require("./dto/create-chat-message.input");
const chat_messages_connection_type_1 = require("./dto/chat-messages-connection.type");
const chat_read_state_updated_payload_1 = require("./dto/chat-read-state-updated.payload");
const chat_room_updated_payload_1 = require("./dto/chat-room-updated.payload");
const chat_rooms_page_type_1 = require("./dto/chat-rooms-page.type");
const pagination_input_1 = require("../common/dto/pagination.input");
let ChatResolver = class ChatResolver {
    chatService;
    pubSub;
    constructor(chatService, pubSub) {
        this.chatService = chatService;
        this.pubSub = pubSub;
    }
    async getMyChatRooms(user, pagination) {
        return await this.chatService.getMyChatRooms(user.sub, pagination?.page ?? 1, pagination?.limit ?? 10);
    }
    async getChatMessages(user, auctionId, limit, cursor) {
        return await this.chatService.getChatMessages(user.sub, user.role, auctionId, limit, cursor);
    }
    async getChatReadState(user, auctionId) {
        return await this.chatService.findReadState(user.sub, user.role, auctionId);
    }
    async getChatReadStates(user, auctionId) {
        return await this.chatService.findReadStates(user.sub, user.role, auctionId);
    }
    async sendMessage(user, input) {
        const senderName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email;
        return await this.chatService.sendMessage(user.sub, senderName, user.role, input);
    }
    async editMessage(user, messageId, newContent) {
        return await this.chatService.editMessage(user.sub, user.role, messageId, newContent);
    }
    async deleteMessage(user, messageId) {
        return await this.chatService.deleteMessage(user.sub, user.role, messageId);
    }
    async reactToMessage(user, messageId, emoji) {
        return await this.chatService.reactToMessage(user.sub, user.role, messageId, emoji);
    }
    async markChatAsRead(user, auctionId, lastReadMessageId) {
        return await this.chatService.markChatAsRead(user.sub, user.role, auctionId, lastReadMessageId);
    }
    resolveContent(message, user) {
        if (message.isDeleted) {
            return user.role === user_role_enum_1.UserRole.ADMIN ? message.content || null : null;
        }
        return message.content || null;
    }
    async messageSent(user, auctionId) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        await this.chatService.verifyChatAccess(user.sub, user.role, auctionId);
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.MESSAGE_SENT);
    }
    async messageUpdated(user, auctionId) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        await this.chatService.verifyChatAccess(user.sub, user.role, auctionId);
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.MESSAGE_UPDATED);
    }
    async chatReadStatusUpdated(user, auctionId) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        await this.chatService.verifyChatAccess(user.sub, user.role, auctionId);
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.CHAT_READ_STATUS_UPDATED);
    }
    myChatRoomUpdated(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.CHAT_ROOM_UPDATED);
    }
};
exports.ChatResolver = ChatResolver;
__decorate([
    (0, graphql_1.Query)(() => chat_rooms_page_type_1.ChatRoomsPage, { name: 'myChatRooms' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('pagination', { type: () => pagination_input_1.PaginationInput, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "getMyChatRooms", null);
__decorate([
    (0, graphql_1.Query)(() => chat_messages_connection_type_1.ChatMessagesConnection, { name: 'chatMessages' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __param(2, (0, graphql_1.Args)('limit', { type: () => Number, defaultValue: 20 })),
    __param(3, (0, graphql_1.Args)('cursor', { type: () => String, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "getChatMessages", null);
__decorate([
    (0, graphql_1.Query)(() => chat_read_state_entity_1.ChatReadState, { name: 'chatReadState', nullable: true }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "getChatReadState", null);
__decorate([
    (0, graphql_1.Query)(() => [chat_read_state_entity_1.ChatReadState], { name: 'chatReadStates' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "getChatReadStates", null);
__decorate([
    (0, throttler_1.Throttle)({ strict: { ttl: 10_000, limit: 10 } }),
    (0, graphql_1.Mutation)(() => chat_message_entity_1.ChatMessage, { name: 'sendMessage' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_chat_message_input_1.CreateChatMessageInput]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "sendMessage", null);
__decorate([
    (0, graphql_1.Mutation)(() => chat_message_entity_1.ChatMessage, { name: 'editMessage' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('messageId', { type: () => graphql_1.ID })),
    __param(2, (0, graphql_1.Args)('newContent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "editMessage", null);
__decorate([
    (0, graphql_1.Mutation)(() => chat_message_entity_1.ChatMessage, { name: 'deleteMessage' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('messageId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "deleteMessage", null);
__decorate([
    (0, graphql_1.Mutation)(() => chat_message_entity_1.ChatMessage, { name: 'reactToMessage' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('messageId', { type: () => graphql_1.ID })),
    __param(2, (0, graphql_1.Args)('emoji', { type: () => String, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "reactToMessage", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean, { name: 'markChatAsRead' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __param(2, (0, graphql_1.Args)('lastReadMessageId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "markChatAsRead", null);
__decorate([
    (0, graphql_1.ResolveField)('content', () => String, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_message_entity_1.ChatMessage, Object]),
    __metadata("design:returntype", Object)
], ChatResolver.prototype, "resolveContent", null);
__decorate([
    (0, graphql_1.Subscription)(() => chat_message_entity_1.ChatMessage, {
        name: 'messageSent',
        filter: (payload, variables, context) => {
            const user = context.user || context.req?.user;
            if (!user)
                return false;
            return payload.messageSent.auctionId.toString() === variables.auctionId;
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "messageSent", null);
__decorate([
    (0, graphql_1.Subscription)(() => chat_message_entity_1.ChatMessage, {
        name: 'messageUpdated',
        filter: (payload, variables, context) => {
            const user = context.user || context.req?.user;
            if (!user)
                return false;
            return (payload.messageUpdated.auctionId.toString() === variables.auctionId);
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "messageUpdated", null);
__decorate([
    (0, graphql_1.Subscription)(() => chat_read_state_updated_payload_1.ChatReadStateUpdatedPayload, {
        name: 'chatReadStatusUpdated',
        filter: (payload, variables, context) => {
            const user = context.user || context.req?.user;
            if (!user)
                return false;
            return (payload.chatReadStatusUpdated.auctionId.toString() ===
                variables.auctionId);
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('auctionId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatResolver.prototype, "chatReadStatusUpdated", null);
__decorate([
    (0, graphql_1.Subscription)(() => chat_room_updated_payload_1.ChatRoomUpdatedPayload, {
        name: 'myChatRoomUpdated',
        filter: (payload, _variables, context) => {
            const user = context.user || context.req?.user;
            if (!user)
                return false;
            return payload.chatRoomUpdated.recipientId === user.sub;
        },
        resolve: (payload) => {
            return {
                auctionId: payload.chatRoomUpdated.auctionId,
                unreadCount: payload.chatRoomUpdated.unreadCount,
                totalUnreadRooms: payload.chatRoomUpdated.totalUnreadRooms,
                lastMessageAt: payload.chatRoomUpdated.lastMessageAt,
                lastMessage: payload.chatRoomUpdated.lastMessage,
            };
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "myChatRoomUpdated", null);
exports.ChatResolver = ChatResolver = __decorate([
    (0, graphql_1.Resolver)(() => chat_message_entity_1.ChatMessage),
    __param(1, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [chat_service_1.ChatService, Function])
], ChatResolver);
//# sourceMappingURL=chat.resolver.js.map