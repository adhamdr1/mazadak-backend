import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WebhookEventDocument = HydratedDocument<WebhookEvent>;

import { PaymentProviderType } from '../enums/payment-provider-type.enum';

@Schema({
  collection: 'webhook_events',
  timestamps: { createdAt: 'receivedAt', updatedAt: false },
  versionKey: false,
})
export class WebhookEvent {
  @Prop({ type: String, required: true, index: { unique: true } })
  providerEventId!: string;

  @Prop({ type: String, enum: PaymentProviderType, required: true })
  provider!: PaymentProviderType;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: String, required: true })
  providerSignature!: string;

  @Prop({ type: Boolean, default: false })
  processed!: boolean;

  @Prop({ type: Date, default: null })
  processedAt!: Date | null;

  @Prop({ type: Number, default: 0 })
  retryCount!: number;

  @Prop({ type: String, default: null })
  errorMessage!: string | null;

  receivedAt!: Date;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
