import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  IChatRepository,
  CreateChatMessageData,
} from '../interfaces/chat-repository.interface';
import {
  ChatMessage,
  ChatMessageDocument,
} from '../entities/chat-message.entity';
import {
  ChatReadState,
  ChatReadStateDocument,
} from '../entities/chat-read-state.entity';

@Injectable()
export class MongoChatRepository implements IChatRepository {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    @InjectModel(ChatReadState.name)
    private readonly readStateModel: Model<ChatReadStateDocument>,
  ) {}

  async createMessage(
    data: CreateChatMessageData,
    session?: ClientSession,
  ): Promise<ChatMessage> {
    const created = new this.messageModel({
      clientMessageId: data.clientMessageId,
      auctionId: new Types.ObjectId(data.auctionId),
      senderId: new Types.ObjectId(data.senderId),
      senderName: data.senderName,
      content: data.content,
      type: data.type,
      mediaUrls: data.mediaUrls,
    });
    return await created.save({ session });
  }

  async findByAuctionIdWithCursor(
    auctionId: string,
    limit: number,
    cursor?: { createdAt: Date; _id: string },
    session?: ClientSession,
  ): Promise<{
    items: ChatMessage[];
    hasNextPage: boolean;
    endCursor: string | null;
  }> {
    const baseFilter = { auctionId: new Types.ObjectId(auctionId) };

    const filter: Record<string, unknown> = cursor
      ? {
          ...baseFilter,
          $or: [
            { createdAt: { $lt: cursor.createdAt } },
            {
              createdAt: cursor.createdAt,
              _id: { $lt: new Types.ObjectId(cursor._id) },
            },
          ],
        }
      : baseFilter;

    const items = await this.messageModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .session(session || null)
      .exec();

    const hasNextPage = items.length > limit;
    const resultItems = hasNextPage ? items.slice(0, limit) : items;

    const endCursor =
      resultItems.length > 0
        ? `${resultItems[resultItems.length - 1].createdAt.toISOString()}_${resultItems[resultItems.length - 1]._id.toString()}`
        : null;

    return {
      items: resultItems,
      hasNextPage,
      endCursor,
    };
  }

  async findByClientMessageId(
    auctionId: string,
    senderId: string,
    clientMessageId: string,
    session?: ClientSession,
  ): Promise<ChatMessage | null> {
    return await this.messageModel
      .findOne({
        auctionId: new Types.ObjectId(auctionId),
        senderId: new Types.ObjectId(senderId),
        clientMessageId,
      })
      .session(session || null)
      .exec();
  }

  async findById(
    messageId: string,
    session?: ClientSession,
  ): Promise<ChatMessage | null> {
    return await this.messageModel
      .findById(messageId)
      .session(session || null)
      .exec();
  }

  async updateMessageAtomically(
    messageId: string,
    senderId: string,
    data: Partial<{ content: string; isEdited: boolean; isDeleted: boolean }>,
    timeLimit?: Date,
    session?: ClientSession,
  ): Promise<ChatMessage | null> {
    const filter: Record<string, unknown> = timeLimit
      ? {
          _id: new Types.ObjectId(messageId),
          senderId: new Types.ObjectId(senderId),
          createdAt: { $gte: timeLimit },
        }
      : {
          _id: new Types.ObjectId(messageId),
        };

    return await this.messageModel
      .findOneAndUpdate(
        filter,
        { $set: data },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async addOrUpdateReaction(
    messageId: string,
    userId: string,
    emoji: string,
    session?: ClientSession,
  ): Promise<ChatMessage | null> {
    // Try to update existing reaction for this user
    let result = await this.messageModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(messageId),
          'reactions.userId': new Types.ObjectId(userId),
        },
        { $set: { 'reactions.$.emoji': emoji } },
        { returnDocument: 'after', session },
      )
      .exec();

    // If no existing reaction, push new one
    if (!result) {
      result = await this.messageModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(messageId) },
          {
            $push: {
              reactions: { emoji, userId: new Types.ObjectId(userId) },
            },
          },
          { returnDocument: 'after', session },
        )
        .exec();
    }

    return result;
  }

  async removeReaction(
    messageId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<ChatMessage | null> {
    return await this.messageModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(messageId) },
        {
          $pull: {
            reactions: { userId: new Types.ObjectId(userId) },
          },
        },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async upsertReadState(
    auctionId: string,
    userId: string,
    lastReadMessageId: string,
    session?: ClientSession,
  ): Promise<ChatReadState> {
    return await this.readStateModel
      .findOneAndUpdate(
        {
          auctionId: new Types.ObjectId(auctionId),
          userId: new Types.ObjectId(userId),
        },
        {
          $set: {
            lastReadMessageId: new Types.ObjectId(lastReadMessageId),
            lastReadAt: new Date(),
          },
        },
        { upsert: true, returnDocument: 'after', session },
      )
      .exec();
  }

  async findReadState(
    auctionId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<ChatReadState | null> {
    return await this.readStateModel
      .findOne({
        auctionId: new Types.ObjectId(auctionId),
        userId: new Types.ObjectId(userId),
      })
      .session(session || null)
      .exec();
  }
}
