import { registerEnumType } from '@nestjs/graphql';

export enum AuctionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(AuctionStatus, {
  name: 'AuctionStatus',
});
