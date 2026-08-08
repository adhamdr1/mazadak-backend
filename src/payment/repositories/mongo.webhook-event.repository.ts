import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import {
  WebhookEvent,
  WebhookEventDocument,
} from '../entities/webhook-event.entity';
import {
  IWebhookEventRepository,
  CreateWebhookEventData,
} from '../interfaces/webhook-event.repository.interface';

@Injectable()
export class MongoWebhookEventRepository implements IWebhookEventRepository {
  constructor(
    @InjectModel(WebhookEvent.name)
    private readonly webhookEventModel: Model<WebhookEventDocument>,
  ) {}

  async findOne(
    providerEventId: string,
    session?: ClientSession,
  ): Promise<WebhookEvent | null> {
    return this.webhookEventModel
      .findOne({ providerEventId })
      .session(session || null)
      .exec();
  }

  async create(
    data: CreateWebhookEventData,
    session?: ClientSession,
  ): Promise<WebhookEvent> {
    const newEvent = new this.webhookEventModel(data);
    return newEvent.save({ session });
  }

  async save(
    webhookEvent: WebhookEvent,
    session?: ClientSession,
  ): Promise<WebhookEvent> {
    const doc = webhookEvent as unknown as WebhookEventDocument;
    if (doc && typeof doc.save === 'function') {
      return doc.save({ session });
    }
    return this.webhookEventModel
      .findByIdAndUpdate(doc._id, doc, { returnDocument: 'after', session })
      .exec() as Promise<WebhookEvent>;
  }
}
