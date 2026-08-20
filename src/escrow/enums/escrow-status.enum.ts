import { registerEnumType } from '@nestjs/graphql';

export enum EscrowStatus {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

registerEnumType(EscrowStatus, {
  name: 'EscrowStatus',
  description: 'Lifecycle status of an escrow hold',
});
