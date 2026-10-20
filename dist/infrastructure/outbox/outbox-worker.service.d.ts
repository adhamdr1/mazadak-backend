import { Model } from 'mongoose';
import { OutboxEvent } from './outbox-event.schema';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import Redis from 'ioredis';
export declare class OutboxWorkerService {
    private readonly outboxModel;
    private readonly rabbitMQService;
    private readonly redis;
    private readonly logger;
    constructor(outboxModel: Model<OutboxEvent>, rabbitMQService: RabbitMQService, redis: Redis);
    dispatchPendingEvents(): Promise<void>;
}
