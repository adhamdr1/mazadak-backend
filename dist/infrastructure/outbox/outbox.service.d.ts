import { Model, ClientSession } from 'mongoose';
import { OutboxEvent } from './outbox-event.schema';
import { RabbitMQEvent, RabbitMQEventPayload } from '../rabbitmq/rabbitmq-event.types';
export declare class OutboxService {
    private readonly outboxModel;
    constructor(outboxModel: Model<OutboxEvent>);
    saveEvent(eventType: RabbitMQEvent, payload: RabbitMQEventPayload, session?: ClientSession, correlationId?: string): Promise<void>;
}
