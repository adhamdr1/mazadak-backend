import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './entities/review.entity';
import { ReviewsResolver } from './reviews.resolver';
import { ReviewsService } from './reviews.service';
import { MongoReviewsRepository } from './repositories/mongo.reviews.repository';
import { ReviewsExpirationService } from './reviews-expiration.service';
import { AuctionsModule } from '../auctions/auctions.module';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';
import { GetUserRatingStatsHandler } from './queries/handlers/get-user-rating-stats.handler';

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    AuctionsModule,
    OutboxModule,
  ],
  providers: [
    ReviewsResolver,
    ReviewsService,
    ReviewsExpirationService,
    GetUserRatingStatsHandler,
    {
      provide: 'IReviewsRepository',
      useClass: MongoReviewsRepository,
    },
  ],
  exports: [ReviewsService, 'IReviewsRepository'],
})
export class ReviewsModule {}
