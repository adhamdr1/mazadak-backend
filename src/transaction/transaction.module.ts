import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionService } from './transaction.service';
import { TransactionResolver } from './transaction.resolver';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { MongoTransactionRepository } from './repositories/mongo.transaction.repository';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    OutboxModule,
  ],
  providers: [
    TransactionResolver,
    TransactionService,
    {
      provide: 'ITransactionRepository',
      useClass: MongoTransactionRepository,
    },
  ],
  exports: [TransactionService, 'ITransactionRepository'],
})
export class TransactionModule {}
