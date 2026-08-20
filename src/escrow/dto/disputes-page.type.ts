import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Dispute } from '../entities/dispute.entity';

@ObjectType()
export class DisputesPage {
  @Field(() => [Dispute])
  items!: Dispute[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Boolean)
  hasNextPage!: boolean;
}
