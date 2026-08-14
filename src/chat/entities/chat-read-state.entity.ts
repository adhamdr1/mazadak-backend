import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatReadStateDocument = HydratedDocument<ChatReadState>;

@ObjectType()
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class ChatReadState {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true })
  auctionId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: 'ChatMessage', default: null })
  lastReadMessageId!: Types.ObjectId | null;

  @Field(() => Date, { nullable: true })
  @Prop({ type: Date, default: null })
  lastReadAt!: Date | null;
}

export const ChatReadStateSchema = SchemaFactory.createForClass(ChatReadState);

// Unique index per auction and user
ChatReadStateSchema.index({ auctionId: 1, userId: 1 }, { unique: true });
