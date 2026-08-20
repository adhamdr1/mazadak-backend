import { registerEnumType } from '@nestjs/graphql';

export enum NotificationReferenceType {
  AUCTION = 'AUCTION',
  TRANSACTION = 'TRANSACTION',
  WALLET = 'WALLET',
  REVIEW = 'REVIEW',
  ESCROW = 'ESCROW',
  DISPUTE = 'DISPUTE',
}

registerEnumType(NotificationReferenceType, {
  name: 'NotificationReferenceType',
});
