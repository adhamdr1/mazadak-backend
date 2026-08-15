import { registerEnumType } from '@nestjs/graphql';

export enum NotificationReferenceType {
  AUCTION = 'AUCTION',
  TRANSACTION = 'TRANSACTION',
  WALLET = 'WALLET',
  REVIEW = 'REVIEW',
}

registerEnumType(NotificationReferenceType, {
  name: 'NotificationReferenceType',
});
