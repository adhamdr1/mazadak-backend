import { registerEnumType } from '@nestjs/graphql';

export enum DisputeReason {
  ITEM_NOT_RECEIVED = 'ITEM_NOT_RECEIVED',
  ITEM_DAMAGED = 'ITEM_DAMAGED',
  ITEM_MISMATCH = 'ITEM_MISMATCH',
  COUNTERFEIT_ITEM = 'COUNTERFEIT_ITEM',
  OTHER = 'OTHER',
}

registerEnumType(DisputeReason, {
  name: 'DisputeReason',
  description: 'Reason for opening a dispute against an escrow transaction',
});
