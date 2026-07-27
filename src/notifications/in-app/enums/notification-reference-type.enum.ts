import { registerEnumType } from '@nestjs/graphql';

export enum NotificationReferenceType {
  AUCTION = 'AUCTION',
  TRANSACTION = 'TRANSACTION',
  WALLET = 'WALLET',
}

registerEnumType(NotificationReferenceType, {
  name: 'NotificationReferenceType',
});
