import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { NotificationCategory } from '../enums/notification-category.enum';
import { InAppNotificationType } from '../enums/in-app-notification-type.enum';
import { SortOrder } from '../../../common/enums/sort-order.enum';

@InputType()
export class NotificationsFilterInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Filter by read status (true for read, false for unread)',
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @Field(() => NotificationCategory, {
    nullable: true,
    description: 'Filter by category tab (AUCTIONS, FINANCIAL, ESCROW, SYSTEM)',
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @Field(() => [InAppNotificationType], {
    nullable: true,
    description: 'Optional filter by specific notification types',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InAppNotificationType, { each: true })
  types?: InAppNotificationType[];

  @Field(() => SortOrder, {
    nullable: true,
    defaultValue: SortOrder.DESC,
    description:
      'Sort order by creation time (DESC: newest first, ASC: oldest first)',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
