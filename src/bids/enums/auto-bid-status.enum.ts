import { registerEnumType } from '@nestjs/graphql';

export enum AutoBidStatus {
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(AutoBidStatus, {
  name: 'AutoBidStatus',
  description:
    'The status of an auto-bid configuration (ACTIVE, EXHAUSTED, CANCELLED)',
});
