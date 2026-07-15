import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionService } from './transaction.service';
import { TransactionResolver } from './transaction.resolver';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { MongoTransactionRepository } from './repositories/mongo.transaction.repository';
import { Wallet, WalletSchema } from '../wallet/entities/wallet.entity';
import { MongoWalletRepository } from '../wallet/repositories/mongo.wallet.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      // مطلوب لـ MongoWalletRepository لجلب walletId من userId
      { name: Wallet.name, schema: WalletSchema },
    ]),
  ],
  providers: [
    TransactionResolver,
    TransactionService,
    {
      provide: 'ITransactionRepository',
      useClass: MongoTransactionRepository,
    },
    {
      provide: 'IWalletRepository',
      useClass: MongoWalletRepository,
    },
  ],
  exports: [TransactionService],
})
export class TransactionModule {}
