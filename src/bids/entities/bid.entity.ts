import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BidStatus } from '../enums/bid-status.enum';

export type BidDocument = HydratedDocument<Bid>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
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

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  amount!: Types.Decimal128;

  @Field(() => BidStatus)
  @Prop({ type: String, enum: BidStatus, required: true, index: true })
  status!: BidStatus;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const BidSchema = SchemaFactory.createForClass(Bid);

BidSchema.index({ auctionId: 1, amount: -1 });
BidSchema.index({ auctionId: 1, status: 1 });
