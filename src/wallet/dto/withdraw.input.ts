import { InputType, Field, Float } from '@nestjs/graphql';
import { IsPositive } from 'class-validator';

@InputType()
export class WithdrawInput {
  @Field(() => Float)
  @IsPositive()
  amount!: number;
}
