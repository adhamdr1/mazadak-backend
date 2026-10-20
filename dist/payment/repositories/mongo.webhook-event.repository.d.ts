import { Model, ClientSession } from 'mongoose';
import { WebhookEvent, WebhookEventDocument } from '../entities/webhook-event.entity';
import { IWebhookEventRepository, CreateWebhookEventData } from '../interfaces/webhook-event.repository.interface';
export declare class MongoWebhookEventRepository implements IWebhookEventRepository {
    private readonly webhookEventModel;
    constructor(webhookEventModel: Model<WebhookEventDocument>);
    findOne(providerEventId: string, session?: ClientSession): Promise<WebhookEvent | null>;
    create(data: CreateWebhookEventData, session?: ClientSession): Promise<WebhookEvent>;
    save(webhookEvent: WebhookEvent, session?: ClientSession): Promise<WebhookEvent>;
}
