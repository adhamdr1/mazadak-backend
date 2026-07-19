import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuctionStatus } from '../enums/auction-status.enum';
import { AuctionCategory } from '../enums/auction-category.enum';

export type AuctionDocument = HydratedDocument<Auction>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
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

  @Field(() => Float)
  @Prop({ required: true })
  startingPrice!: number;

  @Field(() => Float)
  @Prop({ required: true })
  minimumBidIncrement!: number;

  @Field(() => Float)
  @Prop({ required: true })
  currentPrice!: number;

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

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const AuctionSchema = SchemaFactory.createForClass(Auction);
