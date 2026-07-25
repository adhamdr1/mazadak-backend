import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Wallet } from '../entities/wallet.entity';

@ObjectType()
export class WalletsPage {
  @Field(() => [Wallet])
  items: Wallet[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Boolean)
  hasNextPage: boolean;
}
