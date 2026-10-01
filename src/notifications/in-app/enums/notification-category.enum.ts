import { registerEnumType } from '@nestjs/graphql';

export enum NotificationCategory {
  AUCTIONS = 'AUCTIONS',
  FINANCIAL = 'FINANCIAL',
  ESCROW = 'ESCROW',
  SYSTEM = 'SYSTEM',
}

registerEnumType(NotificationCategory, {
  name: 'NotificationCategory',
  description: 'Main notification category grouping for in-app notifications',
});
