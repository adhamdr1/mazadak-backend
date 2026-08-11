import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionReferenceType } from '../enums/transaction-reference-type.enum';

export type TransactionDocument = HydratedDocument<Transaction>;

@ObjectType()
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class Transaction {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({
    type: Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true,
  })
  walletId!: Types.ObjectId;

  @Field(() => TransactionType)
  @Prop({ type: String, enum: TransactionType, required: true })
  type!: TransactionType;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    required: true,
    min: 0,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  amount!: Types.Decimal128;

  @Field(() => String)
  @Prop({ type: String, required: true, uppercase: true, default: 'EGP' })
  currency!: string;

  @Field(() => TransactionStatus)
  @Prop({
    type: String,
    enum: TransactionStatus,
  })
  status!: TransactionStatus;

  // ربط العملية بمزاد معين أو Stripe Payment Intent — Phase 3
  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: null })
  referenceId!: string | null;

  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: null, index: true })
  idempotencyKey!: string | null;

  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: null, index: true })
  gatewayPaymentIntentId!: string | null;

  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: null, index: true })
  gatewayTransactionId!: string | null;

  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: null })
  gatewayProvider!: string | null;

  @Field(() => TransactionReferenceType, { nullable: true })
  @Prop({ type: String, enum: TransactionReferenceType, default: null })
  referenceType!: TransactionReferenceType | null;

  @Field(() => Date, { nullable: true })
  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Field(() => Boolean, { defaultValue: false })
  @Prop({ type: Boolean, default: false, index: true })
  hasChild!: boolean;

  @Field()
  readonly createdAt!: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index(
  { gatewayPaymentIntentId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { gatewayPaymentIntentId: { $type: 'string' } },
  },
);
TransactionSchema.index(
  { idempotencyKey: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);

TransactionSchema.index({ walletId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, type: 1, hasChild: 1 });
