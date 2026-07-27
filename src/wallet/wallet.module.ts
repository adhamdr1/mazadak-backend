import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { WalletResolver } from './wallet.resolver';
import { Wallet, WalletSchema } from './entities/wallet.entity';
import { MongoWalletRepository } from './repositories/mongo.wallet.repository';
import { TransactionModule } from '../transaction/transaction.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    TransactionModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [
    WalletResolver,
    WalletService,
    {
      provide: 'IWalletRepository',
      useClass: MongoWalletRepository,
    },
  ],
  exports: [WalletService],
})
export class WalletModule {}
