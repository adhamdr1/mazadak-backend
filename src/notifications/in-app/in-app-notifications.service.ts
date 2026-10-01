import { Inject, Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import type { IInAppNotificationRepository } from './interfaces/in-app-notification.repository.interface';
import { InAppNotification } from './entities/in-app-notification.entity';
import { CreateInAppNotificationDto } from './dto/create-in-app-notification.dto';
import { InAppNotificationsPage } from './dto/in-app-notifications-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { NotificationsFilterInput } from './dto/notifications-filter.input';
import { NotificationCategory } from './enums/notification-category.enum';
import { InAppNotificationNotFoundException } from '../exceptions/in-app-notification-not-found.exception';
import { RealtimeService } from '../../infrastructure/pubsub/realtime.service';

export const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';

@Injectable()
export class InAppNotificationsService {
  constructor(
    @Inject('IInAppNotificationRepository')
    private readonly notificationRepository: IInAppNotificationRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(
    dto: CreateInAppNotificationDto,
    session?: ClientSession,
  ): Promise<InAppNotification> {
    const notification = await this.notificationRepository.create(dto, session);

    if (session && session.inTransaction()) {
      const originalCommit = session.commitTransaction.bind(
        session,
      ) as () => Promise<void>;
      const mutableSession = session as unknown as {
        commitTransaction: () => Promise<void>;
      };
      mutableSession.commitTransaction = async () => {
        await originalCommit();
        void this.realtimeService.publishNotificationAdded(notification);
      };
    } else {
      // Publish real-time event after saving if no transaction is active
      void this.realtimeService.publishNotificationAdded(notification);
    }

    return notification;
  }

  async getMyNotifications(
    userId: string,
    pagination: PaginationInput,
    filter?: NotificationsFilterInput,
  ): Promise<InAppNotificationsPage> {
    const { page, limit } = pagination;
    const [items, total] = await Promise.all([
      this.notificationRepository.findByUserId(userId, page, limit, filter),
      this.notificationRepository.countByUserId(userId, filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  async getUnreadCount(
    userId: string,
    category?: NotificationCategory,
  ): Promise<number> {
    return await this.notificationRepository.countUnread(userId, category);
  }

  async markAsRead(
    notificationId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<InAppNotification> {
    const updated = await this.notificationRepository.markAsRead(
      notificationId,
      userId,
      session,
    );
    if (!updated) {
      throw new InAppNotificationNotFoundException();
    }

    const publishReadStatus = async () => {
      const unreadCount = await this.notificationRepository.countUnread(userId);
      void this.realtimeService.publishNotificationReadStatusUpdated(userId, {
        notificationId: updated._id.toString(),
        unreadCount,
        category: updated.category,
      });
    };

    if (session && session.inTransaction()) {
      const originalCommit = session.commitTransaction.bind(
        session,
      ) as () => Promise<void>;
      const mutableSession = session as unknown as {
        commitTransaction: () => Promise<void>;
      };
      mutableSession.commitTransaction = async () => {
        await originalCommit();
        void publishReadStatus();
      };
    } else {
      void publishReadStatus();
    }

    return updated;
  }

  async markAllAsRead(userId: string, session?: ClientSession): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId, session);

    const publishAllRead = () => {
      void this.realtimeService.publishNotificationReadStatusUpdated(userId, {
        notificationId: null,
        unreadCount: 0,
        category: null,
      });
    };

    if (session && session.inTransaction()) {
      const originalCommit = session.commitTransaction.bind(
        session,
      ) as () => Promise<void>;
      const mutableSession = session as unknown as {
        commitTransaction: () => Promise<void>;
      };
      mutableSession.commitTransaction = async () => {
        await originalCommit();
        publishAllRead();
      };
    } else {
      publishAllRead();
    }
  }
}
