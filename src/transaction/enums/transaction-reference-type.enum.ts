import { registerEnumType } from '@nestjs/graphql';

export enum TransactionReferenceType {
  AUCTION = 'AUCTION',
  USER = 'USER',
  TRANSACTION = 'TRANSACTION',
}

registerEnumType(TransactionReferenceType, {
  name: 'TransactionReferenceType',
});
