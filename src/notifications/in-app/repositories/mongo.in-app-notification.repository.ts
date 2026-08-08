import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { IInAppNotificationRepository } from '../interfaces/in-app-notification.repository.interface';
import {
  InAppNotification,
  InAppNotificationDocument,
} from '../entities/in-app-notification.entity';
import { CreateInAppNotificationDto } from '../dto/create-in-app-notification.dto';

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
    const created = new this.notificationModel(data);
    return await created.save({ session });
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<InAppNotification[]> {
    const skip = (page - 1) * limit;
    return await this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countByUserId(userId: string): Promise<number> {
    return await this.notificationModel.countDocuments({ userId }).exec();
  }

  async countUnread(userId: string): Promise<number> {
    return await this.notificationModel
      .countDocuments({ userId, isRead: false })
      .exec();
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
}
