import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuctionStatus } from '../enums/auction-status.enum';
import { AuctionCategory } from '../enums/auction-category.enum';

export type AuctionDocument = HydratedDocument<Auction>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class Auction {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sellerId!: Types.ObjectId;

  @Field()
  @Prop({ required: true, trim: true })
  title!: string;

  @Field()
  @Prop({ required: true, trim: true })
  description!: string;

  @Field(() => [String])
  @Prop({ type: [String], default: [] })
  images!: string[];

  @Field(() => AuctionCategory)
  @Prop({ type: String, enum: AuctionCategory, required: true, index: true })
  category!: AuctionCategory;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  startingPrice!: Types.Decimal128;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  minimumBidIncrement!: Types.Decimal128;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  currentPrice!: Types.Decimal128;

  @Field(() => AuctionStatus)
  @Prop({
    type: String,
    enum: AuctionStatus,
    default: AuctionStatus.PENDING,
    index: true,
  })
  status!: AuctionStatus;

  @Field()
  @Prop({ required: true, index: true })
  startTime!: Date;

  @Field()
  @Prop({ required: true, index: true })
  endTime!: Date;

  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  winnerId?: Types.ObjectId;

  @Field(() => Boolean)
  @Prop({ default: false })
  isFinalized!: boolean;

  @Field({ nullable: true })
  @Prop({ type: String, default: null })
  adminActionReason?: string;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const AuctionSchema = SchemaFactory.createForClass(Auction);

// Add text index for full-text search
AuctionSchema.index({ title: 'text', description: 'text' });
