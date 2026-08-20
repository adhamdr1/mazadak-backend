import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DisputeStatus } from '../enums/dispute-status.enum';
import { DisputeReason } from '../enums/dispute-reason.enum';
import { DisputeResolution } from '../enums/dispute-resolution.enum';

export type DisputeDocument = HydratedDocument<Dispute>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class Dispute {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'Escrow', required: true, index: true })
  escrowId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true, index: true })
  auctionId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  openedById!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  againstUserId!: Types.ObjectId;

  @Field(() => DisputeReason)
  @Prop({ type: String, enum: DisputeReason, required: true })
  reason!: DisputeReason;

  @Field(() => String)
  @Prop({ type: String, required: true })
  description!: string;

  @Field(() => [String])
  @Prop({ type: [String], default: [] })
  evidenceUrls!: string[];

  @Field(() => DisputeStatus)
  @Prop({
    type: String,
    enum: DisputeStatus,
    required: true,
    default: DisputeStatus.OPEN,
    index: true,
  })
  status!: DisputeStatus;

  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  adminId?: Types.ObjectId;

  @Field(() => DisputeResolution, { nullable: true })
  @Prop({ type: String, enum: DisputeResolution })
  adminDecision?: DisputeResolution;

  @Field({ nullable: true })
  @Prop({ type: String })
  adminNotes?: string;

  @Field({ nullable: true })
  @Prop({ type: Date })
  resolvedAt?: Date;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);

DisputeSchema.index({ auctionId: 1, status: 1 });
DisputeSchema.index({ openedById: 1, status: 1 });
DisputeSchema.index({ againstUserId: 1, status: 1 });
DisputeSchema.index({ status: 1, createdAt: -1 });
