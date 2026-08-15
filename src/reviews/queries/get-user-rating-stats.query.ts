import { Query } from '@nestjs/cqrs';
import { UserRatingStats } from '../entities/user-rating-stats.entity';

export class GetUserRatingStatsQuery extends Query<UserRatingStats> {
  constructor(readonly userId: string) {
    super();
  }
}
