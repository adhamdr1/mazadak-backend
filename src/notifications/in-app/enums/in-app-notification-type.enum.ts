import { registerEnumType } from '@nestjs/graphql';

export enum InAppNotificationType {
  OUTBID = 'OUTBID',
  AUCTION_WON = 'AUCTION_WON',
  AUCTION_ENDED_SELLER = 'AUCTION_ENDED_SELLER',
  DEPOSIT_SUCCESSFUL = 'DEPOSIT_SUCCESSFUL',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  AUCTION_STARTED = 'AUCTION_STARTED',
  WELCOME = 'WELCOME',
  NEW_BID = 'NEW_BID',
  AUCTION_CANCELLED = 'AUCTION_CANCELLED',
}

registerEnumType(InAppNotificationType, {
  name: 'InAppNotificationType',
});
