import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InAppNotificationType } from '../enums/in-app-notification-type.enum';
import { NotificationReferenceType } from '../enums/notification-reference-type.enum';

export type InAppNotificationDocument = HydratedDocument<InAppNotification>;

@ObjectType()
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class InAppNotification {
  @Field(() => ID)
  readonly _id!: Types.ObjectId;

  @Field(() => ID)
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Field(() => InAppNotificationType)
  @Prop({
    type: String,
    enum: InAppNotificationType,
    required: true,
  })
  type!: InAppNotificationType;

  @Field()
  @Prop({ required: true, trim: true })
  title!: string;

  @Field()
  @Prop({ required: true, trim: true })
  body!: string;

  @Field()
  @Prop({ type: Boolean, default: false })
  isRead!: boolean;

  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: null })
  referenceId!: string | null;

  @Field(() => NotificationReferenceType, { nullable: true })
  @Prop({
    type: String,
    enum: NotificationReferenceType,
    default: null,
  })
  referenceType!: NotificationReferenceType | null;

  @Field()
  readonly createdAt!: Date;
}

export const InAppNotificationSchema =
  SchemaFactory.createForClass(InAppNotification);
