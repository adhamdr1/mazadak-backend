import { InAppNotificationType } from '../enums/in-app-notification-type.enum';
import { NotificationReferenceType } from '../enums/notification-reference-type.enum';

export class CreateInAppNotificationDto {
  userId!: string;
  type!: InAppNotificationType;
  title!: string;
  body!: string;
  referenceId?: string;
  referenceType?: NotificationReferenceType;
}
