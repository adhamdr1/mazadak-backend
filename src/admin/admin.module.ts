import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { AdminUsersResolver } from './resolvers/admin-users.resolver';
import { AdminAuctionsResolver } from './resolvers/admin-auctions.resolver';
import { AdminTransactionsResolver } from './resolvers/admin-transactions.resolver';
import { AdminAnalyticsResolver } from './resolvers/admin-analytics.resolver';
import { AdminAnalyticsService } from './services/admin-analytics.service';

@Module({
  imports: [UsersModule, AuctionsModule, WalletModule, TransactionModule],
  providers: [
    AdminUsersResolver,
    AdminAuctionsResolver,
    AdminTransactionsResolver,
    AdminAnalyticsResolver,
    AdminAnalyticsService,
  ],
})
export class AdminModule {}
