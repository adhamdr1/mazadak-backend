import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bid, BidSchema } from './entities/bid.entity';
import { AutoBid, AutoBidSchema } from './entities/auto-bid.entity';
import { BidsResolver, AutoBidsResolver } from './bids.resolver';
import { BidsService } from './bids.service';
import { MongoBidRepository } from './repositories/mongo.bid.repository';
import { MongoAutoBidRepository } from './repositories/mongo.auto-bid.repository';
import { ProxyBiddingEngineService } from './services/proxy-bidding-engine.service';
import { AutoBiddingService } from './services/auto-bidding.service';
import { WalletModule } from '../wallet/wallet.module';
import { AuctionsModule } from '../auctions/auctions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bid.name, schema: BidSchema },
      { name: AutoBid.name, schema: AutoBidSchema },
    ]),
    WalletModule,
    AuctionsModule,
  ],
  providers: [
    BidsResolver,
    AutoBidsResolver,
    BidsService,
    ProxyBiddingEngineService,
    AutoBiddingService,
    {
      provide: 'IBidRepository',
      useClass: MongoBidRepository,
    },
    {
      provide: 'IAutoBidRepository',
      useClass: MongoAutoBidRepository,
    },
  ],
  exports: [BidsService, AutoBiddingService, ProxyBiddingEngineService],
})
export class BidsModule {}
