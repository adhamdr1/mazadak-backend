import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class DashboardStats {
  @Field(() => Int)
  totalUsers!: number;

  @Field(() => Int)
  verifiedUsers!: number;

  @Field(() => Int)
  activeAuctions!: number;

  @Field(() => Int)
  completedAuctions!: number;

  @Field(() => Int)
  cancelledAuctions!: number;

  @Field(() => Float)
  totalWalletBalance!: number;

  @Field(() => Float)
  todaysRevenue!: number;

  @Field(() => Int)
  totalTransactions!: number;
}
