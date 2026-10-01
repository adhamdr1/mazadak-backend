import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { IInAppNotificationRepository } from '../interfaces/in-app-notification.repository.interface';
import {
  InAppNotification,
  InAppNotificationDocument,
} from '../entities/in-app-notification.entity';
import { CreateInAppNotificationDto } from '../dto/create-in-app-notification.dto';
import { NotificationsFilterInput } from '../dto/notifications-filter.input';
import { NotificationCategory } from '../enums/notification-category.enum';
import { getCategoryForNotificationType } from '../helpers/notification-category.helper';
import { SortOrder } from '../../../common/enums/sort-order.enum';

@Injectable()
export class MongoInAppNotificationRepository implements IInAppNotificationRepository {
  constructor(
    @InjectModel(InAppNotification.name)
    private readonly notificationModel: Model<InAppNotificationDocument>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return await this.notificationModel.db.startSession();
  }

  async create(
    data: CreateInAppNotificationDto,
    session?: ClientSession,
  ): Promise<InAppNotification> {
    const category = data.category ?? getCategoryForNotificationType(data.type);
    const created = new this.notificationModel({
      ...data,
      category,
    });
    return await created.save({ session });
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
    filter?: NotificationsFilterInput,
  ): Promise<InAppNotification[]> {
    const query = this.buildFilterQuery(userId, filter);
    const sortDirection: 1 | -1 = filter?.sortOrder === SortOrder.ASC ? 1 : -1;
    const skip = (page - 1) * limit;
    return await this.notificationModel
      .find(query)
      .sort({ createdAt: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countByUserId(
    userId: string,
    filter?: NotificationsFilterInput,
  ): Promise<number> {
    const query = this.buildFilterQuery(userId, filter);
    return await this.notificationModel.countDocuments(query).exec();
  }

  async countUnread(
    userId: string,
    category?: NotificationCategory,
  ): Promise<number> {
    const query: Record<string, unknown> = {
      userId,
      isRead: false,
    };
    if (category) {
      query.category = category;
    }
    return await this.notificationModel.countDocuments(query).exec();
  }

  async markAsRead(
    notificationId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<InAppNotification | null> {
    return await this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async markAllAsRead(userId: string, session?: ClientSession): Promise<void> {
    await this.notificationModel
      .updateMany({ userId, isRead: false }, { isRead: true }, { session })
      .exec();
  }

  private buildFilterQuery(
    userId: string,
    filter?: NotificationsFilterInput,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = { userId };
    if (!filter) return query;

    if (filter.isRead !== undefined) {
      query.isRead = filter.isRead;
    }
    if (filter.category) {
      query.category = filter.category;
    }
    if (filter.types && filter.types.length > 0) {
      query.type = { $in: filter.types };
    }
    return query;
  }
}
