import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsMongoId, IsNumber, IsPositive } from 'class-validator';

@InputType()
export class SetAutoBidInput {
  @Field(() => ID, {
    description: 'The ID of the auction to configure auto-bidding for',
  })
  @IsMongoId()
  auctionId!: string;

  @Field(() => Float, {
    description: 'The maximum ceiling amount the user is willing to bid',
  })
  @IsNumber()
  @IsPositive()
  maxAmount!: number;
}
