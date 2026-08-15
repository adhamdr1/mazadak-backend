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
  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true, index: true })
  auctionId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reviewerId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reviewedUserId!: Types.ObjectId;

  @Field(() => ReviewType)
  @Prop({ type: String, enum: ReviewType, required: true })
  type!: ReviewType;

  @Field(() => ReviewStatus)
  @Prop({
    type: String,
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
    index: true,
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
  @Prop({ type: Date, required: false, index: true })
  publishedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ auctionId: 1, reviewerId: 1 }, { unique: true });
ReviewSchema.index({ reviewedUserId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, createdAt: 1 });
