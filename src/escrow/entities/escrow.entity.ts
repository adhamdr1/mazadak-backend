import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EscrowStatus } from '../enums/escrow-status.enum';

export type EscrowDocument = HydratedDocument<Escrow>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class Escrow {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({
    type: Types.ObjectId,
    ref: 'Auction',
    required: true,
    unique: true,
    index: true,
  })
  auctionId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  buyerId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sellerId!: Types.ObjectId;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  amount!: Types.Decimal128;

  @Field(() => String)
  @Prop({ type: String, required: true, default: 'EGP' })
  currency!: string;

  @Field(() => EscrowStatus)
  @Prop({
    type: String,
    enum: EscrowStatus,
    required: true,
    default: EscrowStatus.HELD,
    index: true,
  })
  status!: EscrowStatus;

  @Field()
  @Prop({ type: Date, required: true, index: true })
  inspectionPeriodEndsAt!: Date;

  @Field({ nullable: true })
  @Prop({ type: Date })
  releasedAt?: Date;

  @Field({ nullable: true })
  @Prop({ type: Date })
  refundedAt?: Date;

  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: 'Dispute' })
  disputeId?: Types.ObjectId;

  @Field({ nullable: true })
  @Prop({ type: String })
  releaseReason?: string;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const EscrowSchema = SchemaFactory.createForClass(Escrow);

EscrowSchema.index({ status: 1, inspectionPeriodEndsAt: 1 });
EscrowSchema.index({ buyerId: 1, status: 1 });
EscrowSchema.index({ sellerId: 1, status: 1 });
