import { Inject, Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import type { IInAppNotificationRepository } from './interfaces/in-app-notification.repository.interface';
import { InAppNotification } from './entities/in-app-notification.entity';
import { CreateInAppNotificationDto } from './dto/create-in-app-notification.dto';
import { InAppNotificationsPage } from './dto/in-app-notifications-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
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
  ): Promise<InAppNotificationsPage> {
    const { page, limit } = pagination;
    const [items, total] = await Promise.all([
      this.notificationRepository.findByUserId(userId, page, limit),
      this.notificationRepository.countByUserId(userId),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.countUnread(userId);
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
    return updated;
  }

  async markAllAsRead(userId: string, session?: ClientSession): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId, session);
  }
}
