import { ClientSession } from 'mongoose';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatReadState } from '../entities/chat-read-state.entity';
import { ChatMessageType } from '../enums/chat-message-type.enum';

export interface CreateChatMessageData {
  clientMessageId: string;
  auctionId: string;
  senderId: string;
  senderName: string;
  content?: string;
  type?: ChatMessageType;
  mediaUrls?: string[];
}

export interface IChatRepository {
  createMessage(
    data: CreateChatMessageData,
    session?: ClientSession,
  ): Promise<ChatMessage>;

  findByAuctionIdWithCursor(
    auctionId: string,
    limit: number,
    cursor?: { createdAt: Date; _id: string },
    session?: ClientSession,
  ): Promise<{
    items: ChatMessage[];
    hasNextPage: boolean;
    endCursor: string | null;
  }>;

  findByClientMessageId(
    auctionId: string,
    senderId: string,
    clientMessageId: string,
    session?: ClientSession,
  ): Promise<ChatMessage | null>;

  findById(
    messageId: string,
    session?: ClientSession,
  ): Promise<ChatMessage | null>;

  updateMessageAtomically(
    messageId: string,
    senderId: string,
    data: Partial<{ content: string; isEdited: boolean; isDeleted: boolean }>,
    timeLimit?: Date,
    session?: ClientSession,
  ): Promise<ChatMessage | null>;

  addOrUpdateReaction(
    messageId: string,
    userId: string,
    emoji: string,
    session?: ClientSession,
  ): Promise<ChatMessage | null>;

  removeReaction(
    messageId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<ChatMessage | null>;

  upsertReadState(
    auctionId: string,
    userId: string,
    lastReadMessageId: string,
    session?: ClientSession,
  ): Promise<ChatReadState>;

  findReadState(
    auctionId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<ChatReadState | null>;
}
