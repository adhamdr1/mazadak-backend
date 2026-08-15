import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Review } from '../entities/review.entity';

@ObjectType()
export class ReviewsPage {
  @Field(() => [Review])
  items!: Review[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Boolean)
  hasNextPage!: boolean;
}
