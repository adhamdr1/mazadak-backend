import { RabbitMQEvent, RabbitMQEventPayload } from './rabbitmq-event.types';

/**
 * Standard message envelope for every event published to RabbitMQ.
 * Consumers must validate this structure before processing.
 */
export interface RabbitMQMessage {
  /** Unique ID for this specific message — used for Idempotency */
  messageId: string;
  /** Trace ID carried from the originating request */
  correlationId: string;
  /** Domain event type */
  eventType: RabbitMQEvent;
  /** Envelope schema version */
  version: 'v1';
  /** ISO 8601 timestamp of when the event was published */
  timestamp: string;
  /** Event-specific data */
  payload: RabbitMQEventPayload;
}
