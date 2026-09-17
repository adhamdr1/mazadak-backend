import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { PayoutMethod } from '../enums/payout-method.enum';
import { PayoutDetails } from '../dto/payout-details.type';

export type WithdrawalRequestDocument = HydratedDocument<WithdrawalRequest>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class WithdrawalRequest {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  amount!: Types.Decimal128;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  fee!: Types.Decimal128;

  @Field(() => Float)
  @Prop({ type: Number, required: true, default: 2 })
  feePercentage!: number;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  netAmount!: Types.Decimal128;

  @Field(() => String)
  @Prop({ type: String, required: true, default: 'EGP' })
  currency!: string;

  @Field(() => PayoutMethod)
  @Prop({
    type: String,
    enum: PayoutMethod,
    required: true,
    index: true,
  })
  payoutMethod!: PayoutMethod;

  @Field(() => PayoutDetails)
  @Prop({ type: Object, required: true })
  payoutDetails!: PayoutDetails;

  @Field(() => WithdrawalStatus)
  @Prop({
    type: String,
    enum: WithdrawalStatus,
    required: true,
    default: WithdrawalStatus.PENDING,
    index: true,
  })
  status!: WithdrawalStatus;

  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: 'Transaction' })
  holdTransactionId?: Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: 'Transaction' })
  completionTransactionId?: Types.ObjectId;

  @Field({ nullable: true })
  @Prop({ type: String })
  adminReference?: string;

  @Field({ nullable: true })
  @Prop({ type: String })
  receiptUrl?: string;

  @Field({ nullable: true })
  @Prop({ type: String })
  rejectionReason?: string;

  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy?: Types.ObjectId;

  @Field({ nullable: true })
  @Prop({ type: Date })
  processedAt?: Date;

  @Field({ nullable: true })
  @Prop({ type: Date })
  completedAt?: Date;

  @Field()
  @Prop({ type: String, required: true, index: true })
  requestDate!: string; // Format: YYYY-MM-DD in Africa/Cairo

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const WithdrawalRequestSchema =
  SchemaFactory.createForClass(WithdrawalRequest);

WithdrawalRequestSchema.index({ userId: 1, status: 1 });
WithdrawalRequestSchema.index({ userId: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });

// Partial Unique Index — يضمن طلب واحد فقط في اليوم لكل مستخدم (ويستثني الطلبات الملغاة والمرفوضة)
// ويسمح بطلب جديد في اليوم التالي حتى لو كان طلب الأمس ما زال PENDING أو PROCESSING
WithdrawalRequestSchema.index(
  { userId: 1, requestDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          WithdrawalStatus.PENDING,
          WithdrawalStatus.PROCESSING,
          WithdrawalStatus.COMPLETED,
        ],
      },
    },
    name: 'unique_daily_withdrawal_per_user',
  },
);
