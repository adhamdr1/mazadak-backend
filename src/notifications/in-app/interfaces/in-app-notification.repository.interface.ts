import { ClientSession } from 'mongoose';
import { InAppNotification } from '../entities/in-app-notification.entity';
import { CreateInAppNotificationDto } from '../dto/create-in-app-notification.dto';

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
  ): Promise<InAppNotification[]>;

  countByUserId(userId: string): Promise<number>;

  countUnread(userId: string): Promise<number>;

  markAsRead(
    notificationId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<InAppNotification | null>;

  markAllAsRead(userId: string, session?: ClientSession): Promise<void>;
}
