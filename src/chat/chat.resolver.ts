import {
  Resolver,
  Query,
  Mutation,
  Args,
  Subscription,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { PUB_SUB } from '../infrastructure/pubsub/pubsub.provider';
import { PUB_SUB_EVENTS } from '../infrastructure/pubsub/events.constants';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { ChatService } from './chat.service';
import { CreateChatMessageInput } from './dto/create-chat-message.input';
import { ChatMessagesConnection } from './dto/chat-messages-connection.type';
import { ChatReadStateUpdatedPayload } from './dto/chat-read-state-updated.payload';

@Resolver(() => ChatMessage)
export class ChatResolver {
  constructor(
    private readonly chatService: ChatService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}

  @Query(() => ChatMessagesConnection, { name: 'chatMessages' })
  async getChatMessages(
    @CurrentUser() user: JwtPayload,
    @Args('auctionId', { type: () => ID }) auctionId: string,
    @Args('limit', { type: () => Number, defaultValue: 20 }) limit: number,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
  ): Promise<ChatMessagesConnection> {
    return await this.chatService.getChatMessages(
      user.sub,
      user.role,
      auctionId,
      limit,
      cursor,
    );
  }

  @Query(() => ChatReadState, { name: 'chatReadState', nullable: true })
  async getChatReadState(
    @CurrentUser() user: JwtPayload,
    @Args('auctionId', { type: () => ID }) auctionId: string,
  ): Promise<ChatReadState | null> {
    return await this.chatService.findReadState(user.sub, user.role, auctionId);
  }

  @Throttle({ strict: { ttl: 10_000, limit: 10 } })
  @Mutation(() => ChatMessage, { name: 'sendMessage' })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: CreateChatMessageInput,
  ): Promise<ChatMessage> {
    const senderName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.email;
    return await this.chatService.sendMessage(
      user.sub,
      senderName,
      user.role,
      input,
    );
  }

  @Mutation(() => ChatMessage, { name: 'editMessage' })
  async editMessage(
    @CurrentUser() user: JwtPayload,
    @Args('messageId', { type: () => ID }) messageId: string,
    @Args('newContent') newContent: string,
  ): Promise<ChatMessage> {
    return await this.chatService.editMessage(
      user.sub,
      user.role,
      messageId,
      newContent,
    );
  }

  @Mutation(() => ChatMessage, { name: 'deleteMessage' })
  async deleteMessage(
    @CurrentUser() user: JwtPayload,
    @Args('messageId', { type: () => ID }) messageId: string,
  ): Promise<ChatMessage> {
    return await this.chatService.deleteMessage(user.sub, user.role, messageId);
  }

  @Mutation(() => ChatMessage, { name: 'reactToMessage' })
  async reactToMessage(
    @CurrentUser() user: JwtPayload,
    @Args('messageId', { type: () => ID }) messageId: string,
    @Args('emoji', { type: () => String, nullable: true }) emoji?: string,
  ): Promise<ChatMessage> {
    return await this.chatService.reactToMessage(
      user.sub,
      user.role,
      messageId,
      emoji,
    );
  }

  @Mutation(() => Boolean, { name: 'markChatAsRead' })
  async markChatAsRead(
    @CurrentUser() user: JwtPayload,
    @Args('auctionId', { type: () => ID }) auctionId: string,
    @Args('lastReadMessageId', { type: () => ID }) lastReadMessageId: string,
  ): Promise<boolean> {
    return await this.chatService.markChatAsRead(
      user.sub,
      user.role,
      auctionId,
      lastReadMessageId,
    );
  }

  @ResolveField('content', () => String, { nullable: true })
  resolveContent(
    @Parent() message: ChatMessage,
    @CurrentUser() user: JwtPayload,
  ): string | null {
    if (message.isDeleted) {
      return user.role === UserRole.ADMIN ? message.content || null : null;
    }
    return message.content || null;
  }

  @Subscription(() => ChatMessage, {
    name: 'messageSent',
    filter: (
      payload: { messageSent: ChatMessage },
      variables: { auctionId: string },
      context: { user?: JwtPayload; req?: { user?: JwtPayload } },
    ) => {
      const user = context.user || context.req?.user;
      if (!user) return false;
      return payload.messageSent.auctionId.toString() === variables.auctionId;
    },
  })
  async messageSent(
    @CurrentUser() user: JwtPayload,
    @Args('auctionId', { type: () => ID }) auctionId: string,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.chatService.verifyChatAccess(user.sub, user.role, auctionId);

    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.MESSAGE_SENT,
    ) as AsyncIterable<{
      messageSent: ChatMessage;
    }>;
  }

  @Subscription(() => ChatMessage, {
    name: 'messageUpdated',
    filter: (
      payload: { messageUpdated: ChatMessage },
      variables: { auctionId: string },
      context: { user?: JwtPayload; req?: { user?: JwtPayload } },
    ) => {
      const user = context.user || context.req?.user;
      if (!user) return false;
      return (
        payload.messageUpdated.auctionId.toString() === variables.auctionId
      );
    },
  })
  async messageUpdated(
    @CurrentUser() user: JwtPayload,
    @Args('auctionId', { type: () => ID }) auctionId: string,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.chatService.verifyChatAccess(user.sub, user.role, auctionId);

    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.MESSAGE_UPDATED,
    ) as AsyncIterable<{
      messageUpdated: ChatMessage;
    }>;
  }

  @Subscription(() => ChatReadStateUpdatedPayload, {
    name: 'chatReadStatusUpdated',
    filter: (
      payload: { chatReadStatusUpdated: ChatReadStateUpdatedPayload },
      variables: { auctionId: string },
      context: { user?: JwtPayload; req?: { user?: JwtPayload } },
    ) => {
      const user = context.user || context.req?.user;
      if (!user) return false;
      return (
        payload.chatReadStatusUpdated.auctionId.toString() ===
        variables.auctionId
      );
    },
  })
  async chatReadStatusUpdated(
    @CurrentUser() user: JwtPayload,
    @Args('auctionId', { type: () => ID }) auctionId: string,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.chatService.verifyChatAccess(user.sub, user.role, auctionId);

    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.CHAT_READ_STATUS_UPDATED,
    ) as AsyncIterable<{
      chatReadStatusUpdated: ChatReadStateUpdatedPayload;
    }>;
  }
}
