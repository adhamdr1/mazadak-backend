import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { NotificationCategory } from '../enums/notification-category.enum';

@ObjectType()
export class NotificationReadPayload {
  @Field(() => ID, {
    nullable: true,
    description:
      'ID of the read notification, or null if markAllAsRead was called',
  })
  notificationId!: string | null;

  @Field(() => Int, {
    description:
      'Updated total unread notifications count for the authenticated user',
  })
  unreadCount!: number;

  @Field(() => NotificationCategory, {
    nullable: true,
    description: 'Category of the read notification, or null if markAllAsRead',
  })
  category!: NotificationCategory | null;
}
