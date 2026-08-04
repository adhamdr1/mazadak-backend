import { registerEnumType } from '@nestjs/graphql';

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

registerEnumType(TransactionStatus, {
  name: 'TransactionStatus',
});
