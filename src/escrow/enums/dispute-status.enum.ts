import { registerEnumType } from '@nestjs/graphql';

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED_BUYER_REFUNDED = 'RESOLVED_BUYER_REFUNDED',
  RESOLVED_SELLER_PAID = 'RESOLVED_SELLER_PAID',
  CANCELLED = 'CANCELLED',
}

registerEnumType(DisputeStatus, {
  name: 'DisputeStatus',
  description: 'Lifecycle status of an escrow dispute',
});
