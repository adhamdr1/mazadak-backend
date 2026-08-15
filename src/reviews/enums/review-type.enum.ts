import { registerEnumType } from '@nestjs/graphql';

export enum ReviewType {
  BUYER_TO_SELLER = 'BUYER_TO_SELLER',
  SELLER_TO_BUYER = 'SELLER_TO_BUYER',
}

registerEnumType(ReviewType, {
  name: 'ReviewType',
  description:
    'Type of review submitted (buyer reviewing seller or seller reviewing buyer)',
});
