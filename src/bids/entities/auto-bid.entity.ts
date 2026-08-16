import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AutoBidStatus } from '../enums/auto-bid-status.enum';

export type AutoBidDocument = HydratedDocument<AutoBid>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class AutoBid {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true, index: true })
  auctionId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  maxAmount!: Types.Decimal128;

  @Field(() => AutoBidStatus)
  @Prop({
    type: String,
    enum: AutoBidStatus,
    default: AutoBidStatus.ACTIVE,
    required: true,
    index: true,
  })
  status!: AutoBidStatus;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const AutoBidSchema = SchemaFactory.createForClass(AutoBid);

AutoBidSchema.index({ auctionId: 1, userId: 1 }, { unique: true });
AutoBidSchema.index({ auctionId: 1, status: 1, maxAmount: -1, createdAt: 1 });
