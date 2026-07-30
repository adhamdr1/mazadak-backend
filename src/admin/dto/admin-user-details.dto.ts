import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { AuctionsPage } from '../../auctions/dto/auctions-page.type';
import { TransactionsPage } from '../../transaction/dto/transactions-page.type';

@ObjectType()
export class AdminUserDetails {
  @Field(() => User)
  user!: User;

  @Field(() => Wallet, { nullable: true })
  wallet?: Wallet;

  @Field(() => AuctionsPage, { nullable: true })
  recentAuctions?: AuctionsPage;

  @Field(() => TransactionsPage, { nullable: true })
  recentTransactions?: TransactionsPage;
}
