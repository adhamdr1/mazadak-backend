import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { randomUUID } from 'crypto';
import { OutboxEvent } from './outbox-event.schema';
import {
  RabbitMQEvent,
  RabbitMQEventPayload,
} from '../rabbitmq/rabbitmq-event.types';

@Injectable()
export class OutboxService {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEvent>,
  ) {}

  /**
   * Persist an outbox event within an existing Mongoose session/transaction.
   * The event will be dispatched to RabbitMQ by the OutboxWorker after commit.
   *
   * @param eventType     - Domain event type
   * @param payload       - Event-specific data
   * @param session       - Active Mongoose ClientSession (for atomicity)
   * @param correlationId - Optional trace ID from the originating request
   */
  async saveEvent(
    eventType: RabbitMQEvent,
    payload: RabbitMQEventPayload,
    session?: ClientSession,
    correlationId?: string,
  ): Promise<void> {
    await this.outboxModel.create(
      [
        {
          messageId: randomUUID(),
          eventType,
          payload: payload as unknown as Record<string, unknown>,
          correlationId: correlationId ?? randomUUID(),
          publishedAt: null,
        },
      ],
      session ? { session } : undefined,
    );
  }
}
