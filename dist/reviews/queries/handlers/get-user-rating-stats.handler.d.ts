import { IQueryHandler } from '@nestjs/cqrs';
import { GetUserRatingStatsQuery } from '../get-user-rating-stats.query';
import { ReviewsService } from '../../reviews.service';
import { UserRatingStats } from '../../entities/user-rating-stats.entity';
export declare class GetUserRatingStatsHandler implements IQueryHandler<GetUserRatingStatsQuery, UserRatingStats> {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    execute(query: GetUserRatingStatsQuery): Promise<UserRatingStats>;
}
