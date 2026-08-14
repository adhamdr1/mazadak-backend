import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IChatRepository } from './interfaces/chat-repository.interface';
import type { IAuctionRepository } from '../auctions/interfaces/auction-repository.interface';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { ChatMessageType } from './enums/chat-message-type.enum';
import { ChatForbiddenException } from './exceptions/chat-forbidden.exception';
import { ChatNotAllowedException } from './exceptions/chat-not-allowed.exception';
import { ChatEditTimeoutException } from './exceptions/chat-edit-timeout.exception';
import { ChatMessageNotFoundException } from './exceptions/chat-message-not-found.exception';
import { AuctionNotFoundException } from '../auctions/exceptions/auction-not-found.exception';
import { AuctionStatus } from '../auctions/enums/auction-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { CreateChatMessageInput } from './dto/create-chat-message.input';
import { Auction } from '../auctions/entities/auction.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject('IChatRepository')
    private readonly chatRepository: IChatRepository,
    @Inject('IAuctionRepository')
    private readonly auctionRepository: IAuctionRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async validateChatAccess(
    userId: string,
    userRole: UserRole,
    auctionId: string,
  ): Promise<Auction> {
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new AuctionNotFoundException();
    }

    if (auction.status !== AuctionStatus.ENDED || !auction.winnerId) {
      throw new ChatNotAllowedException();
    }

    const isSeller = auction.sellerId.toString() === userId;
    const isWinner = auction.winnerId.toString() === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isSeller && !isWinner && !isAdmin) {
      throw new ChatForbiddenException();
    }

    return auction;
  }

  async verifyChatAccess(
    userId: string,
    userRole: UserRole,
    auctionId: string,
  ): Promise<void> {
    await this.validateChatAccess(userId, userRole, auctionId);
  }

  async sendMessage(
    senderId: string,
    senderName: string,
    userRole: UserRole,
    input: CreateChatMessageInput,
  ): Promise<ChatMessage> {
    const auction = await this.validateChatAccess(
      senderId,
      userRole,
      input.auctionId,
    );

    let message: ChatMessage;
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
    } catch (err) {
      const errorWithCode = err as { code?: number };
      if (errorWithCode && errorWithCode.code === 11000) {
        this.logger.log(
          `Duplicate clientMessageId detected: ${input.clientMessageId}. Returning existing message.`,
        );
        const existing = await this.chatRepository.findByClientMessageId(
          input.auctionId,
          senderId,
          input.clientMessageId,
        );
        if (existing) {
          return existing;
        }
      }
      throw err;
    }

    // Publish to Redis PubSub for real-time (fire-and-forget)
    void this.realtimeService.publishMessageSent(message);

    // Publish to RabbitMQ for offline notifications (fire-and-forget, try/catch)
    void this.publishChatNotification(auction, senderId, message);

    return message;
  }

  private async publishChatNotification(
    auction: Auction,
    senderId: string,
    message: ChatMessage,
  ): Promise<void> {
    try {
      const recipientId =
        senderId === auction.sellerId.toString()
          ? auction.winnerId?.toString()
          : auction.sellerId.toString();

      if (!recipientId) {
        throw new Error('Recipient ID not found');
      }

      await this.rabbitMQService.publish(RabbitMQEvent.ChatMessageSent, {
        recipientId,
        auctionId: auction._id.toString(),
        auctionTitle: auction.title,
        senderId,
        messageType: message.type,
        preview:
          message.type === ChatMessageType.IMAGE
            ? 'Image'
            : message.content
              ? message.content.substring(0, 50)
              : '',
      });
    } catch (err) {
      this.logger.error(
        `Failed to publish chat notification to RabbitMQ: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async editMessage(
    userId: string,
    userRole: UserRole,
    messageId: string,
    newContent: string,
  ): Promise<ChatMessage> {
    const message = await this.chatRepository.findById(messageId);
    if (!message) {
      throw new ChatMessageNotFoundException();
    }

    if (message.senderId.toString() !== userId) {
      throw new ChatForbiddenException();
    }

    await this.validateChatAccess(
      userId,
      userRole,
      message.auctionId.toString(),
    );

    const timeLimit = new Date(Date.now() - 15 * 60 * 1000);
    const updated = await this.chatRepository.updateMessageAtomically(
      messageId,
      userId,
      { content: newContent, isEdited: true },
      timeLimit,
    );

    if (!updated) {
      throw new ChatEditTimeoutException();
    }

    void this.realtimeService.publishMessageUpdated(updated);

    return updated;
  }

  async deleteMessage(
    userId: string,
    userRole: UserRole,
    messageId: string,
  ): Promise<ChatMessage> {
    const message = await this.chatRepository.findById(messageId);
    if (!message) {
      throw new ChatMessageNotFoundException();
    }

    const isOwner = message.senderId.toString() === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ChatForbiddenException();
    }

    await this.validateChatAccess(
      userId,
      userRole,
      message.auctionId.toString(),
    );

    const timeLimit = isAdmin
      ? undefined
      : new Date(Date.now() - 15 * 60 * 1000);
    const updated = await this.chatRepository.updateMessageAtomically(
      messageId,
      message.senderId.toString(),
      { isDeleted: true },
      timeLimit,
    );

    if (!updated) {
      throw new ChatEditTimeoutException();
    }

    void this.realtimeService.publishMessageUpdated(updated);

    return updated;
  }

  async reactToMessage(
    userId: string,
    userRole: UserRole,
    messageId: string,
    emoji?: string,
  ): Promise<ChatMessage> {
    const message = await this.chatRepository.findById(messageId);
    if (!message) {
      throw new ChatMessageNotFoundException();
    }

    await this.validateChatAccess(
      userId,
      userRole,
      message.auctionId.toString(),
    );

    let updated: ChatMessage | null;
    if (emoji) {
      updated = await this.chatRepository.addOrUpdateReaction(
        messageId,
        userId,
        emoji,
      );
    } else {
      updated = await this.chatRepository.removeReaction(messageId, userId);
    }

    if (!updated) {
      throw new ChatMessageNotFoundException();
    }

    void this.realtimeService.publishMessageUpdated(updated);

    return updated;
  }

  async getChatMessages(
    userId: string,
    userRole: UserRole,
    auctionId: string,
    limit: number,
    cursor?: string,
  ): Promise<{
    items: ChatMessage[];
    hasNextPage: boolean;
    endCursor: string | null;
  }> {
    await this.validateChatAccess(userId, userRole, auctionId);

    let parsedCursor: { createdAt: Date; _id: string } | undefined;
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

    return await this.chatRepository.findByAuctionIdWithCursor(
      auctionId,
      safeLimit,
      parsedCursor,
    );
  }

  async markChatAsRead(
    userId: string,
    userRole: UserRole,
    auctionId: string,
    lastReadMessageId: string,
  ): Promise<boolean> {
    await this.validateChatAccess(userId, userRole, auctionId);

    const readState = await this.chatRepository.upsertReadState(
      auctionId,
      userId,
      lastReadMessageId,
    );

    void this.realtimeService.publishChatReadStatusUpdated({
      auctionId,
      userId,
      lastReadMessageId: readState.lastReadMessageId?.toString() || null,
      lastReadAt: readState.lastReadAt,
    });

    return true;
  }

  async findReadState(
    userId: string,
    userRole: UserRole,
    auctionId: string,
  ): Promise<ChatReadState | null> {
    await this.validateChatAccess(userId, userRole, auctionId);
    return await this.chatRepository.findReadState(auctionId, userId);
  }
}
