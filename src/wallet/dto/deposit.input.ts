import { InputType, Field, Float } from '@nestjs/graphql';
import { IsPositive } from 'class-validator';

@InputType()
export class DepositInput {
  @Field(() => Float)
  @IsPositive()
  amount!: number;
}
