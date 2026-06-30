import {
  ObjectType,
  Field,
  ID,
  Float,
  registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose'; // 👈 1. ضفنا هنا HydratedDocument و Types

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}

registerEnumType(UserRole, { name: 'UserRole' });
registerEnumType(AuthProvider, { name: 'AuthProvider' });

@ObjectType()
export class Address {
  @Field()
  @Prop({ required: true })
  city!: string;

  @Field()
  @Prop({ required: true })
  street!: string;
}

@ObjectType()
export class Balances {
  @Field(() => Float)
  @Prop({ default: 0 })
  total!: number;

  @Field(() => Float)
  @Prop({ default: 0 })
  held!: number;
}

export type UserDocument = HydratedDocument<User>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
})
export class User {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field()
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Field()
  @Prop({ required: true, trim: true })
  lastName!: string;

  @Field()
  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Field(() => AuthProvider)
  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.LOCAL })
  authProvider!: AuthProvider;

  @Field({ nullable: true })
  @Prop({ default: null, index: true })
  readonly googleId?: string;

  @Prop({
    select: false,
    required: function (this: { authProvider: AuthProvider }) {
      return this.authProvider === AuthProvider.LOCAL;
    },
  })
  password?: string;

  @Field(() => UserRole)
  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Field()
  @Prop({ required: true, unique: true, index: true, trim: true })
  phoneNumber!: string;

  @Field()
  @Prop({ required: true })
  dateOfBirth!: Date;

  @Field(() => Address)
  @Prop({ type: Address, required: true })
  address!: Address;

  @Field(() => Balances)
  @Prop({ type: Balances, default: () => ({ total: 0, held: 0 }) })
  balances!: Balances;

  @Field()
  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Field()
  @Prop({ default: false })
  isDeleted!: boolean;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
