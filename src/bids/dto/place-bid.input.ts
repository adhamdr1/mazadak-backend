import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsMongoId, IsNumber, IsPositive } from 'class-validator';

@InputType()
export class PlaceBidInput {
  @Field(() => ID)
  @IsMongoId()
  auctionId!: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  amount!: number;
}
