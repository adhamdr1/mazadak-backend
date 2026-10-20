import { NotificationCategory } from '../enums/notification-category.enum';
export declare class NotificationReadPayload {
    notificationId: string | null;
    unreadCount: number;
    category: NotificationCategory | null;
}
