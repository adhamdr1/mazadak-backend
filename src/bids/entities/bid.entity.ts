import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BidStatus } from '../enums/bid-status.enum';

export type BidDocument = HydratedDocument<Bid>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
})
export class Bid {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true, index: true })
  auctionId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  bidderId!: Types.ObjectId;

  @Field(() => Float)
  @Prop({ required: true })
  amount!: number;

  @Field(() => BidStatus)
  @Prop({ type: String, enum: BidStatus, required: true, index: true })
  status!: BidStatus;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const BidSchema = SchemaFactory.createForClass(Bid);
