import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { WalletResolver } from './wallet.resolver';
import { WalletConsumer } from './consumers/wallet.consumer';
import { Wallet, WalletSchema } from './entities/wallet.entity';
import { MongoWalletRepository } from './repositories/mongo.wallet.repository';
import { TransactionModule } from '../transaction/transaction.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';
import { CqrsModule } from '@nestjs/cqrs';
import { GetWalletBalanceHandler } from './queries/handlers/get-wallet-balance.handler';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    TransactionModule,
    NotificationsModule,
    OutboxModule,
    CqrsModule,
  ],
  providers: [
    WalletResolver,
    WalletService,
    WalletConsumer,
    GetWalletBalanceHandler,
    {
      provide: 'IWalletRepository',
      useClass: MongoWalletRepository,
    },
  ],
  exports: [WalletService],
})
export class WalletModule {}
