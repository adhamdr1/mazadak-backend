import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class Wallet {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    default: 0,
    min: 0,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  balance!: Types.Decimal128;

  @Field(() => String)
  @Prop({
    type: Types.Decimal128,
    default: 0,
    min: 0,
    get: (val: Types.Decimal128 | null) => (val ? val.toString() : '0.00'),
  })
  heldBalance!: Types.Decimal128;

  // Computed field — resolved in WalletResolver via @ResolveField
  @Field(() => String)
  availableBalance!: string;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
