import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description:
    'Indicates whether the current user is eligible to review an auction',
})
export class CanReviewAuctionResponse {
  @Field(() => Boolean)
  canReview!: boolean;

  @Field(() => String, { nullable: true })
  reason?: string;
}
