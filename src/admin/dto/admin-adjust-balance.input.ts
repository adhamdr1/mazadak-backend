import { InputType, Field, Float, registerEnumType } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export enum AdminAdjustBalanceType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

registerEnumType(AdminAdjustBalanceType, {
  name: 'AdminAdjustBalanceType',
  description: 'Type of manual admin balance adjustment (CREDIT or DEBIT)',
});

@InputType()
export class AdminAdjustBalanceInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @Field(() => Float)
  @IsPositive({ message: 'AMOUNT_MUST_BE_POSITIVE' })
  amount!: number;

  @Field(() => AdminAdjustBalanceType)
  @IsEnum(AdminAdjustBalanceType)
  type!: AdminAdjustBalanceType;

  @Field()
  @IsNotEmpty({ message: 'REASON_REQUIRED' })
  @IsString()
  @MinLength(10, { message: 'REASON_TOO_SHORT' })
  reason!: string;
}
