import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class TreasuryStats {
  @Field(() => Float)
  totalWalletBalance!: number;

  @Field(() => Float)
  totalHeldInWallets!: number;

  @Field(() => Float)
  totalPendingWithdrawals!: number;

  @Field(() => Int)
  pendingWithdrawalsCount!: number;

  @Field(() => Float)
  totalHeldInEscrow!: number;

  @Field(() => Float)
  totalCompletedPayouts!: number;

  @Field(() => Float)
  totalCollectedFees!: number;
}
