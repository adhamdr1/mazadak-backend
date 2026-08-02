import { registerEnumType } from '@nestjs/graphql';

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Status of the payment intent from the gateway provider',
});
