import { UserRatingStats } from '../../reviews/entities/user-rating-stats.entity';
export declare class PublicProfile {
    id: string;
    firstName: string;
    lastName: string;
    city?: string;
    memberSince: Date;
    ratingStats?: UserRatingStats;
    activeAuctionsCount: number;
    completedAuctionsCount: number;
}
