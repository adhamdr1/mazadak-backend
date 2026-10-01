import { InAppNotificationType } from '../enums/in-app-notification-type.enum';
import { NotificationCategory } from '../enums/notification-category.enum';
import { NotificationReferenceType } from '../enums/notification-reference-type.enum';

export class CreateInAppNotificationDto {
  userId!: string;
  type!: InAppNotificationType;
  title!: string;
  body!: string;
  category?: NotificationCategory;
  referenceId?: string;
  referenceType?: NotificationReferenceType;
}
