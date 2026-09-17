import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WithdrawalRequest,
  WithdrawalRequestSchema,
} from './entities/withdrawal-request.entity';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsResolver } from './withdrawals.resolver';
import { MongoWithdrawalRepository } from './repositories/mongo.withdrawal.repository';
import { WalletModule } from '../wallet/wallet.module';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
    ]),
    WalletModule,
    OutboxModule,
  ],
  providers: [
    WithdrawalsService,
    WithdrawalsResolver,
    {
      provide: 'IWithdrawalRepository',
      useClass: MongoWithdrawalRepository,
    },
  ],
  exports: [WithdrawalsService, 'IWithdrawalRepository'],
})
export class WithdrawalsModule {}
