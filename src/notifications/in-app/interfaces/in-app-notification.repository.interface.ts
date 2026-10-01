import { ClientSession } from 'mongoose';
import { InAppNotification } from '../entities/in-app-notification.entity';
import { CreateInAppNotificationDto } from '../dto/create-in-app-notification.dto';
import { NotificationsFilterInput } from '../dto/notifications-filter.input';
import { NotificationCategory } from '../enums/notification-category.enum';

export interface IInAppNotificationRepository {
  startSession(): Promise<ClientSession>;

  create(
    data: CreateInAppNotificationDto,
    session?: ClientSession,
  ): Promise<InAppNotification>;

  findByUserId(
    userId: string,
    page: number,
    limit: number,
    filter?: NotificationsFilterInput,
  ): Promise<InAppNotification[]>;

  countByUserId(
    userId: string,
    filter?: NotificationsFilterInput,
  ): Promise<number>;

  countUnread(userId: string, category?: NotificationCategory): Promise<number>;

  markAsRead(
    notificationId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<InAppNotification | null>;

  markAllAsRead(userId: string, session?: ClientSession): Promise<void>;
}
