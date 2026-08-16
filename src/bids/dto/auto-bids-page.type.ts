import { ObjectType, Field, Int } from '@nestjs/graphql';
import { AutoBid } from '../entities/auto-bid.entity';

@ObjectType()
export class AutoBidsPage {
  @Field(() => [AutoBid])
  items!: AutoBid[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field()
  hasNextPage!: boolean;
}
