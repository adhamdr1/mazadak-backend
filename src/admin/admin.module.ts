import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';
import { EscrowModule } from '../escrow/escrow.module';
import { AdminUsersResolver } from './resolvers/admin-users.resolver';
import { AdminAuctionsResolver } from './resolvers/admin-auctions.resolver';
import { AdminTransactionsResolver } from './resolvers/admin-transactions.resolver';
import { AdminAnalyticsResolver } from './resolvers/admin-analytics.resolver';
import { AdminWithdrawalsResolver } from './resolvers/admin-withdrawals.resolver';
import { AdminFinancialResolver } from './resolvers/admin-financial.resolver';
import { AdminAnalyticsService } from './services/admin-analytics.service';

@Module({
  imports: [
    UsersModule,
    AuctionsModule,
    WalletModule,
    TransactionModule,
    WithdrawalsModule,
    EscrowModule,
  ],
  providers: [
    AdminUsersResolver,
    AdminAuctionsResolver,
    AdminTransactionsResolver,
    AdminAnalyticsResolver,
    AdminWithdrawalsResolver,
    AdminFinancialResolver,
    AdminAnalyticsService,
  ],
})
export class AdminModule {}
