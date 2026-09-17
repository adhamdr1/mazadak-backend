import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class WithdrawalFeePreview {
  @Field(() => String)
  requestedAmount!: string;

  @Field(() => String)
  fee!: string;

  @Field(() => Float)
  feePercentage!: number;

  @Field(() => String)
  netAmount!: string;

  @Field(() => Float)
  maxAllowed!: number;

  @Field(() => String)
  estimatedDelivery!: string;
}
