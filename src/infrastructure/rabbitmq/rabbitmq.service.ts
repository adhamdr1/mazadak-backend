import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { RABBITMQ_CLIENT, MAZADAK_EXCHANGE } from './rabbitmq.constants';
import { RabbitMQEvent, RabbitMQEventPayload } from './rabbitmq-event.types';
import { RabbitMQMessage } from './rabbitmq-message.interface';

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  /**
   * Publish a domain event to RabbitMQ.
   * Uses the exchange routing key pattern: "<exchange>.<eventType>"
   *
   * @param eventType     - Domain event name (e.g. RabbitMQEvent.BidPlaced)
   * @param payload       - Event-specific data
   * @param correlationId - Optional trace ID from the originating request
   */
  async publish(
    eventType: RabbitMQEvent,
    payload: RabbitMQEventPayload,
    correlationId?: string,
  ): Promise<void> {
    const message: RabbitMQMessage = {
      messageId: randomUUID(),
      correlationId: correlationId ?? randomUUID(),
      eventType,
      version: 'v1',
      timestamp: new Date().toISOString(),
      payload,
    };

    try {
      // emit is fire-and-forget (no reply expected).
      // NestJS ClientProxy wraps this in { pattern, data } and publishes to
      // the configured queue. The message content is the RabbitMQMessage envelope.
      await this.client
        .emit({ exchange: MAZADAK_EXCHANGE, routingKey: eventType }, message)
        .toPromise();

      this.logger.debug(
        `Published [${eventType}] messageId=${message.messageId}`,
      );
    } catch (err) {
      // Log but do not rethrow — caller is responsible for Outbox fallback
      this.logger.error(
        `Failed to publish [${eventType}]: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
