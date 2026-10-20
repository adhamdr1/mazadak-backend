import { InAppNotificationsService } from './in-app-notifications.service';
import { InAppNotification } from './entities/in-app-notification.entity';
import { InAppNotificationsPage } from './dto/in-app-notifications-page.type';
import { NotificationsFilterInput } from './dto/notifications-filter.input';
import { NotificationCategory } from './enums/notification-category.enum';
import { NotificationReadPayload } from './dto/notification-read.payload';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PaginationInput } from '../../common/dto/pagination.input';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
export declare class InAppNotificationsResolver {
    private readonly inAppNotificationsService;
    private readonly pubSub;
    constructor(inAppNotificationsService: InAppNotificationsService, pubSub: RedisPubSub);
    getMyNotifications(currentUser: JwtPayload, pagination: PaginationInput, filter?: NotificationsFilterInput): Promise<InAppNotificationsPage>;
    getUnreadNotificationsCount(currentUser: JwtPayload, category?: NotificationCategory): Promise<number>;
    markNotificationAsRead(currentUser: JwtPayload, notificationId: string): Promise<InAppNotification>;
    markAllNotificationsAsRead(currentUser: JwtPayload): Promise<boolean>;
    notificationAdded(user: JwtPayload): AsyncIterable<{
        notificationAdded: InAppNotification;
    }>;
    notificationReadStatusUpdated(user: JwtPayload): AsyncIterable<{
        userId: string;
        notificationReadStatusUpdated: NotificationReadPayload;
    }>;
}
