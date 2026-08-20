import { registerEnumType } from '@nestjs/graphql';

export enum DisputeResolution {
  REFUND_BUYER = 'REFUND_BUYER',
  PAY_SELLER = 'PAY_SELLER',
}

registerEnumType(DisputeResolution, {
  name: 'DisputeResolution',
  description: 'Admin resolution decision for an escrow dispute',
});
