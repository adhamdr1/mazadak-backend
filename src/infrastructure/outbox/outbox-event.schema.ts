import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';
import { RabbitMQEvent } from '../rabbitmq/rabbitmq-event.types';

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({
  collection: 'outbox_events',
  timestamps: { createdAt: 'createdAt', updatedAt: false },
})
export class OutboxEvent {
  @Prop({
    type: String,
    default: () => randomUUID(),
    unique: true,
    index: true,
  })
  messageId: string;

  @Prop({ type: String, required: true, enum: RabbitMQEvent })
  eventType: RabbitMQEvent;

  @Prop({ type: String, default: 'v1' })
  version: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({ type: String, required: true })
  correlationId: string;

  /**
   * Null  = pending (not yet dispatched to RabbitMQ).
   * Date  = dispatched successfully.
   * Index on this field to allow fast polling by the OutboxWorker.
   */
  @Prop({ type: Date, default: null, index: true })
  publishedAt: Date | null;

  createdAt: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

// Auto-delete successfully dispatched outbox events after 7 days to prevent collection bloat.
// Since MongoDB TTL index ignores null/non-date values, pending events (publishedAt: null) are never deleted.
OutboxEventSchema.index(
  { publishedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 },
);
