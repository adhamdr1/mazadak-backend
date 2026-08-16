import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { AutoBidStatus } from '../enums/auto-bid-status.enum';

@ObjectType('AutoBidResponse')
export class AutoBidType {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  auctionId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => Float, {
    description:
      'The configured max amount (strictly confidential, returned only to the owner)',
  })
  maxAmount!: number;

  @Field(() => AutoBidStatus)
  status!: AutoBidStatus;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
