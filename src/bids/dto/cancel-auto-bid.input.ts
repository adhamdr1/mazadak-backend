import { InputType, Field, ID } from '@nestjs/graphql';
import { IsMongoId } from 'class-validator';

@InputType()
export class CancelAutoBidInput {
  @Field(() => ID, {
    description: 'The ID of the auction to cancel auto-bidding for',
  })
  @IsMongoId()
  auctionId!: string;
}
