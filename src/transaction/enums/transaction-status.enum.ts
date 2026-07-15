import { registerEnumType } from '@nestjs/graphql';

export enum TransactionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

registerEnumType(TransactionStatus, {
  name: 'TransactionStatus',
});
