import { registerEnumType } from '@nestjs/graphql';

export enum TransactionReferenceType {
  AUCTION = 'AUCTION',
  TRANSACTION = 'TRANSACTION',
  ESCROW = 'ESCROW',
  DISPUTE = 'DISPUTE',
  WITHDRAWAL = 'WITHDRAWAL',
}

registerEnumType(TransactionReferenceType, {
  name: 'TransactionReferenceType',
});
