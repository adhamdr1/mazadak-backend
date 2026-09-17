import { registerEnumType } from '@nestjs/graphql';

export enum PayoutMethod {
  VODAFONE_CASH = 'VODAFONE_CASH',
  ORANGE_CASH = 'ORANGE_CASH',
  ETISALAT_CASH = 'ETISALAT_CASH',
  WE_PAY = 'WE_PAY',
  INSTAPAY = 'INSTAPAY',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
}

registerEnumType(PayoutMethod, {
  name: 'PayoutMethod',
  description: 'Payout destination methods supported by Mazadak',
});
