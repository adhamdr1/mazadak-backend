import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  RatingBreakdown,
  RatingBreakdownSchema,
} from './rating-breakdown.entity';

@Schema({ _id: false })
@ObjectType()
export class UserRatingStats {
  @Field(() => Float)
  @Prop({ type: Number, default: 0 })
  averageRating!: number;

  @Field(() => Int)
  @Prop({ type: Number, default: 0 })
  totalReviews!: number;

  @Field(() => Float)
  @Prop({ type: Number, default: 0 })
  asSellerAverageRating!: number;

  @Field(() => Int)
  @Prop({ type: Number, default: 0 })
  asSellerTotalReviews!: number;

  @Field(() => Float)
  @Prop({ type: Number, default: 0 })
  asBuyerAverageRating!: number;

  @Field(() => Int)
  @Prop({ type: Number, default: 0 })
  asBuyerTotalReviews!: number;

  @Field(() => RatingBreakdown)
  @Prop({ type: RatingBreakdownSchema, default: () => ({}) })
  breakdown!: RatingBreakdown;
}

export const UserRatingStatsSchema =
  SchemaFactory.createForClass(UserRatingStats);
