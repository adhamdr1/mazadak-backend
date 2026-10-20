import { ClientSession, Model, Types } from 'mongoose';
import { IChatRepository, CreateChatMessageData } from '../interfaces/chat-repository.interface';
import { ChatMessage, ChatMessageDocument } from '../entities/chat-message.entity';
import { ChatReadState, ChatReadStateDocument } from '../entities/chat-read-state.entity';
export declare class MongoChatRepository implements IChatRepository {
    private readonly messageModel;
    private readonly readStateModel;
    constructor(messageModel: Model<ChatMessageDocument>, readStateModel: Model<ChatReadStateDocument>);
    createMessage(data: CreateChatMessageData, session?: ClientSession): Promise<ChatMessage>;
    findByAuctionIdWithCursor(auctionId: string, limit: number, cursor?: {
        createdAt: Date;
        _id: string;
    }, session?: ClientSession): Promise<{
        items: ChatMessage[];
        hasNextPage: boolean;
        endCursor: string | null;
    }>;
    findByClientMessageId(auctionId: string, senderId: string, clientMessageId: string, session?: ClientSession): Promise<ChatMessage | null>;
    findById(messageId: string, session?: ClientSession): Promise<ChatMessage | null>;
    updateMessageAtomically(messageId: string, senderId: string, data: Partial<{
        content: string;
        isEdited: boolean;
        isDeleted: boolean;
    }>, timeLimit?: Date, session?: ClientSession): Promise<ChatMessage | null>;
    addOrUpdateReaction(messageId: string, userId: string, emoji: string, session?: ClientSession): Promise<ChatMessage | null>;
    removeReaction(messageId: string, userId: string, session?: ClientSession): Promise<ChatMessage | null>;
    upsertReadState(auctionId: string, userId: string, lastReadMessageId: string, session?: ClientSession): Promise<ChatReadState>;
    findReadState(auctionId: string, userId: string, session?: ClientSession): Promise<ChatReadState | null>;
    findReadStatesByAuction(auctionId: string, session?: ClientSession): Promise<ChatReadState[]>;
    getUnreadCountForRoom(auctionId: string, userId: string, session?: ClientSession): Promise<number>;
    getTotalUnreadRoomsCount(userId: string, auctionIds: Types.ObjectId[]): Promise<number>;
    getLatestMessagesForAuctions(auctionIds: Types.ObjectId[]): Promise<Map<string, {
        lastMessage: ChatMessage;
        lastMessageAt: Date;
    }>>;
    getUnreadCountsForAuctions(auctionIds: Types.ObjectId[], userId: string): Promise<Map<string, number>>;
}
