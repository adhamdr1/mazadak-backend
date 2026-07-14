import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { WalletResolver } from './wallet.resolver';
import { Wallet, WalletSchema } from './entities/wallet.entity';
import { MongoWalletRepository } from './repositories/mongo.wallet.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
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
