import { registerEnumType } from '@nestjs/graphql';

export enum AuctionsSortField {
  CREATED_AT = 'createdAt',
  START_TIME = 'startTime',
  END_TIME = 'endTime',
  CURRENT_PRICE = 'currentPrice',
  TITLE = 'title',
}

registerEnumType(AuctionsSortField, {
  name: 'AuctionsSortField',
  description: 'Fields by which auctions can be sorted',
});
