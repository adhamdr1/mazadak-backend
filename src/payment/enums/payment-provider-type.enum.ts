import { registerEnumType } from '@nestjs/graphql';

export enum PaymentProviderType {
  STRIPE = 'STRIPE',
  PAYMOB = 'PAYMOB',
}

registerEnumType(PaymentProviderType, {
  name: 'PaymentProviderType',
  description: 'Supported payment providers',
});
