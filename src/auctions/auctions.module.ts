import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuctionsService } from './auctions.service';
import { AuctionsResolver } from './auctions.resolver';
import { Auction, AuctionSchema } from './entities/auction.entity';
import { MongoAuctionRepository } from './repositories/mongo.auction.repository';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Auction.name, schema: AuctionSchema }]),
    UploadModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [
    AuctionsResolver,
    AuctionsService,
    {
      provide: 'IAuctionRepository',
      useClass: MongoAuctionRepository,
    },
  ],
  exports: [AuctionsService, 'IAuctionRepository'],
})
export class AuctionsModule {}
