import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Escrow } from '../entities/escrow.entity';

@ObjectType()
export class EscrowsPage {
  @Field(() => [Escrow])
  items!: Escrow[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Boolean)
  hasNextPage!: boolean;
}
