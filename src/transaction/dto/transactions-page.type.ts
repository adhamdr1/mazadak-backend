import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Transaction } from '../entities/transaction.entity';

@ObjectType()
export class TransactionsPage {
  @Field(() => [Transaction])
  items!: Transaction[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field()
  hasNextPage!: boolean;
}
