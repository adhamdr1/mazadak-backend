import { Query } from '@nestjs/cqrs';
import { UserRatingStats } from '../entities/user-rating-stats.entity';
export declare class GetUserRatingStatsQuery extends Query<UserRatingStats> {
    readonly userId: string;
    constructor(userId: string);
}
