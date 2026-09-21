import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { Escrow, EscrowSchema, Dispute, DisputeSchema } from './entities';
import {
  EscrowService,
  DisputesService,
  EscrowExpirationService,
} from './services';
import { MongoEscrowRepository, MongoDisputeRepository } from './repositories';
import { EscrowResolver, DisputesResolver } from './resolvers';
import { WalletModule } from '../wallet/wallet.module';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([
      { name: Escrow.name, schema: EscrowSchema },
      { name: Dispute.name, schema: DisputeSchema },
    ]),
    WalletModule,
    OutboxModule,
  ],
  providers: [
    EscrowService,
    DisputesService,
    EscrowExpirationService,
    EscrowResolver,
    DisputesResolver,
    {
      provide: 'IEscrowRepository',
      useClass: MongoEscrowRepository,
    },
    {
      provide: 'IDisputeRepository',
      useClass: MongoDisputeRepository,
    },
  ],
  exports: [
    EscrowService,
    DisputesService,
    'IEscrowRepository',
    'IDisputeRepository',
  ],
})
export class EscrowModule {}
