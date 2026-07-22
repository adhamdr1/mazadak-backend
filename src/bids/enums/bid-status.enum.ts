import { registerEnumType } from '@nestjs/graphql';

export enum BidStatus {
  WINNING = 'WINNING',
  OUTBID = 'OUTBID',
}

registerEnumType(BidStatus, {
  name: 'BidStatus',
});
