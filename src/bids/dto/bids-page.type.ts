import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Bid } from '../entities/bid.entity';

@ObjectType()
export class BidsPage {
  @Field(() => [Bid])
  items!: Bid[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field()
  hasNextPage!: boolean;
}
