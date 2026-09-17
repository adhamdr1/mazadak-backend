import { InputType, Field, Float } from '@nestjs/graphql';
import {
  IsNumber,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  IsNotEmptyObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayoutMethod } from '../enums/payout-method.enum';
import { PayoutDetailsInput } from './payout-details.input';

@InputType()
export class RequestWithdrawalInput {
  @Field(() => Float)
  @IsNumber()
  @Min(50, { message: 'WITHDRAWAL_BELOW_MINIMUM' })
  @Max(10_000_000, { message: 'WITHDRAWAL_EXCEEDS_MAXIMUM' })
  amount!: number;

  @Field(() => PayoutMethod)
  @IsEnum(PayoutMethod)
  payoutMethod!: PayoutMethod;

  @Field(() => PayoutDetailsInput)
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => PayoutDetailsInput)
  payoutDetails!: PayoutDetailsInput;
}
