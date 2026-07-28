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
  ): Promise<InAppNotificationsPage> {
    return await this.inAppNotificationsService.getMyNotifications(
      currentUser.sub,
      pagination,
    );
  }

  @Query(() => Int, { name: 'unreadNotificationsCount' })
  async getUnreadNotificationsCount(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<number> {
    return await this.inAppNotificationsService.getUnreadCount(currentUser.sub);
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
}
