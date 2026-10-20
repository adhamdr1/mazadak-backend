import { RabbitMQEvent, RabbitMQEventPayload } from './rabbitmq-event.types';
export interface RabbitMQMessage {
    messageId: string;
    correlationId: string;
    eventType: RabbitMQEvent;
    version: 'v1';
    timestamp: string;
    payload: RabbitMQEventPayload;
}
