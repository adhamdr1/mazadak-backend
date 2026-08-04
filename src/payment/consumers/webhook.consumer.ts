import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import {
  PAYMENTS_WEBHOOK_QUEUE,
  RETRY_QUEUE_5S,
  RETRY_QUEUE_30S,
  RETRY_QUEUE_2M,
  X_RETRY_COUNT,
} from '../../infrastructure/rabbitmq/rabbitmq.constants';
import {
  RabbitMQParsedMessage,
  RabbitMQEvent,
} from '../../infrastructure/rabbitmq/rabbitmq-event.types';
import { PaymentService } from '../payment.service';

@Injectable()
export class WebhookConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookConsumer.name);
  private connection?: amqplib.ChannelModel;
  private channel?: amqplib.Channel;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    try {
      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();

      await this.channel.prefetch(1);

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      await this.channel.consume(PAYMENTS_WEBHOOK_QUEUE, async (msg) => {
        if (!msg) return;

        try {
          const content = msg.content.toString();
          const parsedMessage = JSON.parse(content) as RabbitMQParsedMessage;

          if (
            parsedMessage.eventType === RabbitMQEvent.PaymentWebhookReceived
          ) {
            await this.paymentService.processPaymentWebhookEvent(
              parsedMessage.payload,
            );
          }

          this.channel?.ack(msg);
        } catch (error: unknown) {
          const err = error as Error;
          this.handleProcessingError(msg, err);
        }
      });

      this.logger.log('Started consuming PAYMENTS_WEBHOOK_QUEUE');
    } catch (err) {
      this.logger.error(
        'Failed to initialize WebhookConsumer RabbitMQ connection',
        err,
      );
    }
  }

  private handleProcessingError(msg: amqplib.ConsumeMessage, err: Error): void {
    if (!this.channel) return;

    const headers = (msg.properties.headers as Record<string, unknown>) || {};
    const retryCount = (Number(headers[X_RETRY_COUNT]) || 0) + 1;

    let targetQueue: string | null = null;
    if (retryCount === 1) {
      targetQueue = RETRY_QUEUE_5S;
    } else if (retryCount === 2) {
      targetQueue = RETRY_QUEUE_30S;
    } else if (retryCount === 3) {
      targetQueue = RETRY_QUEUE_2M;
    }

    if (targetQueue) {
      this.logger.warn(
        `Webhook processing failed (attempt ${retryCount}). Re-queueing to ${targetQueue} for retry: ${err.message}`,
      );
      this.channel.sendToQueue(targetQueue, msg.content, {
        headers: {
          ...headers,
          [X_RETRY_COUNT]: retryCount,
        },
      });
      this.channel.ack(msg);
    } else {
      this.logger.error(
        `Webhook processing failed after ${retryCount - 1} retries. Routing to Dead Letter Queue: ${err.message}`,
        err.stack,
      );
      // Reject and do not requeue to route it to Dead Letter Queue (DLQ)
      this.channel.nack(msg, false, false);
    }
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}
