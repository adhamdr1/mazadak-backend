import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { AuthProvider } from '../enums/auth-provider.enum';

@Schema({ _id: false })
@ObjectType()
export class Address {
  @Field()
  @Prop({ required: true })
  city!: string;

  @Field()
  @Prop({ required: true })
  street!: string;
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
  @Prop({ default: null, index: true, sparse: true })
  googleId?: string;

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

  @Field()
  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Field({ nullable: true })
  @Prop({ default: null, index: true, sparse: true })
  deletedAt?: Date;

  @Field()
  readonly createdAt!: Date;

  @Field()
  readonly updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
