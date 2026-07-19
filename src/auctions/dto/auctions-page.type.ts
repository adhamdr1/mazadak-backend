import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Auction } from '../entities/auction.entity';

@ObjectType()
export class AuctionsPage {
  @Field(() => [Auction])
  items!: Auction[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field()
  hasNextPage!: boolean;
}
