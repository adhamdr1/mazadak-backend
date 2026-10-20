import { ClientSession } from 'mongoose';
import type { IInAppNotificationRepository } from './interfaces/in-app-notification.repository.interface';
import { InAppNotification } from './entities/in-app-notification.entity';
import { CreateInAppNotificationDto } from './dto/create-in-app-notification.dto';
import { InAppNotificationsPage } from './dto/in-app-notifications-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { NotificationsFilterInput } from './dto/notifications-filter.input';
import { NotificationCategory } from './enums/notification-category.enum';
import { RealtimeService } from '../../infrastructure/pubsub/realtime.service';
export declare const NOTIFICATION_ADDED = "NOTIFICATION_ADDED";
export declare class InAppNotificationsService {
    private readonly notificationRepository;
    private readonly realtimeService;
    constructor(notificationRepository: IInAppNotificationRepository, realtimeService: RealtimeService);
    create(dto: CreateInAppNotificationDto, session?: ClientSession): Promise<InAppNotification>;
    getMyNotifications(userId: string, pagination: PaginationInput, filter?: NotificationsFilterInput): Promise<InAppNotificationsPage>;
    getUnreadCount(userId: string, category?: NotificationCategory): Promise<number>;
    markAsRead(notificationId: string, userId: string, session?: ClientSession): Promise<InAppNotification>;
    markAllAsRead(userId: string, session?: ClientSession): Promise<void>;
}
