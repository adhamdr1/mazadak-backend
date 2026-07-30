import { registerEnumType } from '@nestjs/graphql';

export enum TransactionsSortField {
  CREATED_AT = 'createdAt',
  AMOUNT = 'amount',
}

registerEnumType(TransactionsSortField, {
  name: 'TransactionsSortField',
  description: 'Fields by which transactions can be sorted',
});
