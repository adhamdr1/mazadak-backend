import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
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

  @Field(() => Float)
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

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
  { unique: true, sparse: true },
);
TransactionSchema.index(
  { idempotencyKey: 1, status: 1 },
  { unique: true, sparse: true },
);
