import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Review } from '../entities/review.entity';
import { UserRatingStats } from '../entities/user-rating-stats.entity';

/**
 * Real-time payload emitted when a review is published for a specific user.
 * Sent over the reviewAddedToUser subscription to update public profiles live.
 */
@ObjectType()
export class ReviewAddedPayload {
  /** The ID of the user who received the review */
  @Field(() => ID)
  reviewedUserId!: string;

  /** The newly published review */
  @Field(() => Review)
  review!: Review;

  /** Freshly aggregated rating statistics for the reviewed user */
  @Field(() => UserRatingStats)
  updatedRatingStats!: UserRatingStats;
}
