import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
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

  @Field(() => Float)
  @Prop({ type: Number, default: 0, min: 0 })
  balance!: number;

  @Field(() => Float)
  @Prop({ type: Number, default: 0, min: 0 })
  heldBalance!: number;

  // Computed field — resolved in WalletResolver via @ResolveField
  @Field(() => Float)
  availableBalance!: number;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
