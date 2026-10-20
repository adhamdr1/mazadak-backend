import { NotificationCategory } from '../enums/notification-category.enum';
import { InAppNotificationType } from '../enums/in-app-notification-type.enum';
import { SortOrder } from '../../../common/enums/sort-order.enum';
export declare class NotificationsFilterInput {
    isRead?: boolean;
    category?: NotificationCategory;
    types?: InAppNotificationType[];
    sortOrder?: SortOrder;
}
