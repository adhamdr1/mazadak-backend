import { registerEnumType } from '@nestjs/graphql';

export enum TransactionType {
  // اليوزر يشحن رصيد في محفظته
  DEPOSIT = 'DEPOSIT',

  // اليوزر يسحب رصيد من محفظته
  WITHDRAW = 'WITHDRAW',

  // تجميد جزء من الرصيد عند وضع مزايدة
  HOLD = 'HOLD',

  // فك التجميد عند خسارة المزاد
  RELEASE = 'RELEASE',

  // خصم الرصيد المجمد نهائياً عند الفوز بالمزاد
  CAPTURE = 'CAPTURE',
}

registerEnumType(TransactionType, {
  name: 'TransactionType',
});
