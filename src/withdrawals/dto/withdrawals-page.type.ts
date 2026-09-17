import { ObjectType, Field, Int } from '@nestjs/graphql';
import { WithdrawalRequest } from '../entities/withdrawal-request.entity';

@ObjectType()
export class WithdrawalsPage {
  @Field(() => [WithdrawalRequest])
  items!: WithdrawalRequest[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Boolean)
  hasNextPage!: boolean;
}
