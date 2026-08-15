import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserRatingStatsQuery } from '../get-user-rating-stats.query';
import { ReviewsService } from '../../reviews.service';
import { UserRatingStats } from '../../entities/user-rating-stats.entity';

@QueryHandler(GetUserRatingStatsQuery)
export class GetUserRatingStatsHandler implements IQueryHandler<
  GetUserRatingStatsQuery,
  UserRatingStats
> {
  constructor(private readonly reviewsService: ReviewsService) {}

  async execute(query: GetUserRatingStatsQuery): Promise<UserRatingStats> {
    return this.reviewsService.getUserRatingStats(query.userId);
  }
}
