import { registerEnumType } from '@nestjs/graphql';

export enum PaymentProviderType {
  STRIPE = 'STRIPE',
  PAYMOB = 'PAYMOB',
  MOYASAR = 'MOYASAR',
}

registerEnumType(PaymentProviderType, {
  name: 'PaymentProviderType',
  description: 'Supported payment providers',
});
