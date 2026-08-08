import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bid, BidSchema } from './entities/bid.entity';
import { BidsResolver } from './bids.resolver';
import { BidsService } from './bids.service';
import { MongoBidRepository } from './repositories/mongo.bid.repository';
import { WalletModule } from '../wallet/wallet.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bid.name, schema: BidSchema }]),
    WalletModule,
    AuctionsModule,
    NotificationsModule,
  ],
  providers: [
    BidsResolver,
    BidsService,
    {
      provide: 'IBidRepository',
      useClass: MongoBidRepository,
    },
  ],
  exports: [BidsService],
})
export class BidsModule {}
