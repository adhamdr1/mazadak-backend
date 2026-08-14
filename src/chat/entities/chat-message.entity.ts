import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ChatMessageType } from '../enums/chat-message-type.enum';

// Embedded subdocument — not a standalone Mongoose Schema
@ObjectType()
export class ChatReaction {
  @Field()
  emoji!: string;

  @Field(() => ID)
  userId!: Types.ObjectId;
}

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@ObjectType()
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true },
})
export class ChatMessage {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field()
  @Prop({ required: true })
  clientMessageId!: string;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'Auction', required: true, index: true })
  auctionId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  @Field(() => ChatMessageType)
  @Prop({
    type: String,
    enum: ChatMessageType,
    default: ChatMessageType.TEXT,
  })
  type!: ChatMessageType;

  @Field({ nullable: true })
  @Prop({ trim: true, default: null })
  content?: string;

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: null })
  mediaUrls?: string[];

  @Field(() => [ChatReaction])
  @Prop({
    type: [
      {
        emoji: { type: String, required: true },
        userId: { type: Types.ObjectId, ref: 'User', required: true },
      },
    ],
    default: [],
  })
  reactions!: ChatReaction[];

  @Field(() => Boolean)
  @Prop({ default: false })
  isEdited!: boolean;

  @Field(() => Boolean)
  @Prop({ default: false })
  isDeleted!: boolean;

  @Field()
  @Prop({ required: true })
  senderName!: string;

  @Field()
  readonly createdAt!: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Unique index for idempotency scoped to { auctionId, senderId, clientMessageId }
ChatMessageSchema.index(
  { auctionId: 1, senderId: 1, clientMessageId: 1 },
  { unique: true },
);

// Compounded index for deterministic pagination
ChatMessageSchema.index({ auctionId: 1, createdAt: -1, _id: -1 });
