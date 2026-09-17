import { registerEnumType } from '@nestjs/graphql';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(WithdrawalStatus, {
  name: 'WithdrawalStatus',
  description: 'Lifecycle status of a withdrawal request',
});
