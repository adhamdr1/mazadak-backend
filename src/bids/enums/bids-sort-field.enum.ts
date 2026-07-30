import { registerEnumType } from '@nestjs/graphql';

export enum BidsSortField {
  CREATED_AT = 'createdAt',
  AMOUNT = 'amount',
}

registerEnumType(BidsSortField, {
  name: 'BidsSortField',
  description: 'Fields by which bids can be sorted',
});
