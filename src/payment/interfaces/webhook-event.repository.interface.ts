import { ClientSession } from 'mongoose';
import { WebhookEvent } from '../entities/webhook-event.entity';

export interface CreateWebhookEventData {
  providerEventId: string;
  provider: string;
  payload: Record<string, unknown>;
  providerSignature: string;
  processed?: boolean;
}

export interface IWebhookEventRepository {
  findOne(
    providerEventId: string,
    session?: ClientSession,
  ): Promise<WebhookEvent | null>;

  create(
    data: CreateWebhookEventData,
    session?: ClientSession,
  ): Promise<WebhookEvent>;

  save(
    webhookEvent: WebhookEvent,
    session?: ClientSession,
  ): Promise<WebhookEvent>;
}
