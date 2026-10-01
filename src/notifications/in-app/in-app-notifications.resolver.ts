import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  Subscription,
} from '@nestjs/graphql';
import { Inject, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InAppNotificationsService } from './in-app-notifications.service';
import { PUB_SUB_EVENTS } from '../../infrastructure/pubsub/events.constants';
import { InAppNotification } from './entities/in-app-notification.entity';
import { InAppNotificationsPage } from './dto/in-app-notifications-page.type';
import { NotificationsFilterInput } from './dto/notifications-filter.input';
import { NotificationCategory } from './enums/notification-category.enum';
import { NotificationReadPayload } from './dto/notification-read.payload';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PaginationInput } from '../../common/dto/pagination.input';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../../infrastructure/pubsub/pubsub.provider';

@Resolver(() => InAppNotification)
@UseGuards(JwtAuthGuard)
export class InAppNotificationsResolver {
  constructor(
    private readonly inAppNotificationsService: InAppNotificationsService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}

  @Query(() => InAppNotificationsPage, { name: 'myNotifications' })
  async getMyNotifications(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') pagination: PaginationInput,
    @Args('filter', { nullable: true }) filter?: NotificationsFilterInput,
  ): Promise<InAppNotificationsPage> {
    return await this.inAppNotificationsService.getMyNotifications(
      currentUser.sub,
      pagination,
      filter,
    );
  }

  @Query(() => Int, { name: 'unreadNotificationsCount' })
  async getUnreadNotificationsCount(
    @CurrentUser() currentUser: JwtPayload,
    @Args('category', {
      type: () => NotificationCategory,
      nullable: true,
      description:
        'Optional category to get unread count specifically for that category tab',
    })
    category?: NotificationCategory,
  ): Promise<number> {
    return await this.inAppNotificationsService.getUnreadCount(
      currentUser.sub,
      category,
    );
  }

  @Mutation(() => InAppNotification, { name: 'markNotificationAsRead' })
  async markNotificationAsRead(
    @CurrentUser() currentUser: JwtPayload,
    @Args('notificationId', { type: () => ID }) notificationId: string,
  ): Promise<InAppNotification> {
    return await this.inAppNotificationsService.markAsRead(
      notificationId,
      currentUser.sub,
    );
  }

  @Mutation(() => Boolean, { name: 'markAllNotificationsAsRead' })
  async markAllNotificationsAsRead(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<boolean> {
    await this.inAppNotificationsService.markAllAsRead(currentUser.sub);
    return true;
  }

  /**
   * Real-time subscription: delivers notifications only to the owner.
   * Security: userId is NEVER accepted from args — it is always read from
   * the authenticated WebSocket context (populated in onConnect).
   * Rejects the subscription if no authenticated user is in context.
   */
  @Subscription(() => InAppNotification, {
    name: 'notificationAdded',
    filter: (
      payload: { notificationAdded: InAppNotification },
      _variables: Record<string, never>,
      context: { user?: JwtPayload },
    ) => {
      // No authenticated user in WS context — deny silently
      if (!context.user) return false;
      return payload.notificationAdded.userId.toString() === context.user.sub;
    },
  })
  notificationAdded(@CurrentUser() user: JwtPayload) {
    // Explicit auth check: throw before subscribing if not authenticated
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required to subscribe to notifications',
      );
    }
    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.NOTIFICATION_ADDED,
    ) as AsyncIterable<{ notificationAdded: InAppNotification }>;
  }

  /**
   * Real-time subscription: broadcasts read state updates and new unread counts to the owner.
   * Enables seamless multi-tab and multi-device synchronization.
   */
  @Subscription(() => NotificationReadPayload, {
    name: 'notificationReadStatusUpdated',
    filter: (
      payload: {
        userId: string;
        notificationReadStatusUpdated: NotificationReadPayload;
      },
      _variables: Record<string, never>,
      context: { user?: JwtPayload },
    ) => {
      if (!context.user) return false;
      return payload.userId === context.user.sub;
    },
    resolve: (payload: {
      userId: string;
      notificationReadStatusUpdated: NotificationReadPayload;
    }) => payload.notificationReadStatusUpdated,
  })
  notificationReadStatusUpdated(@CurrentUser() user: JwtPayload) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required to subscribe to notification read updates',
      );
    }
    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.NOTIFICATION_READ_STATUS_UPDATED,
    ) as AsyncIterable<{
      userId: string;
      notificationReadStatusUpdated: NotificationReadPayload;
    }>;
  }
}
