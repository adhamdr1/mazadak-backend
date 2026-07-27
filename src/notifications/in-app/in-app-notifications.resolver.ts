import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InAppNotificationsService } from './in-app-notifications.service';
import { InAppNotification } from './entities/in-app-notification.entity';
import { InAppNotificationsPage } from './dto/in-app-notifications-page.type';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PaginationInput } from '../../common/dto/pagination.input';

@Resolver(() => InAppNotification)
@UseGuards(JwtAuthGuard)
export class InAppNotificationsResolver {
  constructor(
    private readonly inAppNotificationsService: InAppNotificationsService,
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
}
