import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ReviewType } from '../enums/review-type.enum';
import { ReviewStatus } from '../enums/review-status.enum';
import { ReviewCriteria, ReviewCriteriaSchema } from './review-criteria.entity';

export type ReviewDocument = HydratedDocument<Review>;

@ObjectType()
@Schema({
  timestamps: true,
  collection: 'reviews',
})
export class Review {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewedUserId!: Types.ObjectId;

  @Field(() => ReviewType)
  @Prop({ type: String, enum: ReviewType, required: true })
  type!: ReviewType;

  @Field(() => ReviewStatus)
  @Prop({
    type: String,
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status!: ReviewStatus;

  @Field(() => Float)
  @Prop({ type: Number, required: true, min: 1, max: 5 })
  overallRating!: number;

  @Field(() => ReviewCriteria, { nullable: true })
  @Prop({ type: ReviewCriteriaSchema, required: false })
  criteria?: ReviewCriteria;

  @Field({ nullable: true })
  @Prop({ type: String, maxlength: 500, trim: true, required: false })
  comment?: string;

  @Field({ nullable: true })
  @Prop({ type: String, maxlength: 300, trim: true, required: false })
  reply?: string;

  @Field({ nullable: true })
  @Prop({ type: Date, required: false })
  repliedAt?: Date;

  @Field({ nullable: true })
  @Prop({ type: Date, required: false })
  publishedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// 1. Primary user reviews query index (Equality on reviewedUserId + status, Sort on createdAt desc)
ReviewSchema.index({ reviewedUserId: 1, status: 1, createdAt: -1 });

// 2. User reviews sorted by rating (Equality on reviewedUserId + status, Sort on overallRating desc)
ReviewSchema.index({ reviewedUserId: 1, status: 1, overallRating: -1 });

// 3. User's written reviews query index (Equality on reviewerId, Sort on createdAt desc)
ReviewSchema.index({ reviewerId: 1, createdAt: -1 });

// 4. Strict integrity: Unique review per auction per reviewer
ReviewSchema.index({ auctionId: 1, reviewerId: 1 }, { unique: true });

// 5. Expiration cron queries for pending reviews
ReviewSchema.index({ status: 1, createdAt: 1 });
