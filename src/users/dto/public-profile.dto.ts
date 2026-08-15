import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { UserRatingStats } from '../../reviews/entities/user-rating-stats.entity';

@ObjectType({ description: 'Sanitized public profile projection for a user' })
export class PublicProfile {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => Date)
  memberSince!: Date;

  @Field(() => UserRatingStats, { nullable: true })
  ratingStats?: UserRatingStats;

  @Field(() => Int, { defaultValue: 0 })
  activeAuctionsCount!: number;

  @Field(() => Int, { defaultValue: 0 })
  completedAuctionsCount!: number;
}
