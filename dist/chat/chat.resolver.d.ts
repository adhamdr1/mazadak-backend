import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { ChatService } from './chat.service';
import { CreateChatMessageInput } from './dto/create-chat-message.input';
import { ChatMessagesConnection } from './dto/chat-messages-connection.type';
import { ChatReadStateUpdatedPayload } from './dto/chat-read-state-updated.payload';
import type { ChatRoomUpdatedInternalPayload } from './interfaces/chat-room-updated-internal.payload';
import { ChatRoomsPage } from './dto/chat-rooms-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
export declare class ChatResolver {
    private readonly chatService;
    private readonly pubSub;
    constructor(chatService: ChatService, pubSub: RedisPubSub);
    getMyChatRooms(user: JwtPayload, pagination?: PaginationInput): Promise<ChatRoomsPage>;
    getChatMessages(user: JwtPayload, auctionId: string, limit: number, cursor?: string): Promise<ChatMessagesConnection>;
    getChatReadState(user: JwtPayload, auctionId: string): Promise<ChatReadState | null>;
    getChatReadStates(user: JwtPayload, auctionId: string): Promise<ChatReadState[]>;
    sendMessage(user: JwtPayload, input: CreateChatMessageInput): Promise<ChatMessage>;
    editMessage(user: JwtPayload, messageId: string, newContent: string): Promise<ChatMessage>;
    deleteMessage(user: JwtPayload, messageId: string): Promise<ChatMessage>;
    reactToMessage(user: JwtPayload, messageId: string, emoji?: string): Promise<ChatMessage>;
    markChatAsRead(user: JwtPayload, auctionId: string, lastReadMessageId: string): Promise<boolean>;
    resolveContent(message: ChatMessage, user: JwtPayload): string | null;
    messageSent(user: JwtPayload, auctionId: string): Promise<AsyncIterable<{
        messageSent: ChatMessage;
    }>>;
    messageUpdated(user: JwtPayload, auctionId: string): Promise<AsyncIterable<{
        messageUpdated: ChatMessage;
    }>>;
    chatReadStatusUpdated(user: JwtPayload, auctionId: string): Promise<AsyncIterable<{
        chatReadStatusUpdated: ChatReadStateUpdatedPayload;
    }>>;
    myChatRoomUpdated(user: JwtPayload): AsyncIterable<{
        chatRoomUpdated: ChatRoomUpdatedInternalPayload;
    }>;
}
