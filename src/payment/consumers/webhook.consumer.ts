import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import * as amqpManager from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import {
  PAYMENTS_WEBHOOK_QUEUE,
  WEBHOOK_RETRY_QUEUE_5S,
  WEBHOOK_RETRY_QUEUE_30S,
  WEBHOOK_RETRY_QUEUE_2M,
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
  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  onModuleInit() {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');
    this.connection = amqpManager.connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('Connected to RabbitMQ (WebhookConsumer)!');
    });

    this.connection.on('disconnect', (err) => {
      this.logger.warn(
        `Disconnected from RabbitMQ (WebhookConsumer): ${err.err.message}. Reconnecting...`,
      );
    });

    this.channelWrapper = this.connection.createChannel({
      setup: (channel: amqplib.Channel) => {
        return Promise.all([
          channel.prefetch(1),
          channel.consume(
            PAYMENTS_WEBHOOK_QUEUE,
            (msg: amqplib.ConsumeMessage | null) => {
              if (msg) {
                this.handleMessage(msg, channel).catch((error: unknown) => {
                  this.logger.error(
                    `Unhandled error in webhook consumer: ${error instanceof Error ? error.message : String(error)}`,
                  );
                });
              }
            },
            { noAck: false },
          ),
        ]);
      },
    });

    this.logger.log('Started consuming PAYMENTS_WEBHOOK_QUEUE');
  }

  private async handleMessage(
    msg: amqplib.ConsumeMessage,
    channel: amqplib.Channel,
  ): Promise<void> {
    let parsedMessage: RabbitMQParsedMessage;
    try {
      const content = msg.content.toString();
      const raw = JSON.parse(content) as unknown;
      parsedMessage = (
        raw && typeof raw === 'object' && 'data' in raw
          ? (raw as { data: RabbitMQParsedMessage }).data
          : raw
      ) as RabbitMQParsedMessage;
    } catch (parseError) {
      this.logger.error(
        `WebhookConsumer failed to parse message JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Rejecting to DLQ immediately.`,
      );
      channel.reject(msg, false);
      return;
    }

    try {
      if (parsedMessage.eventType === RabbitMQEvent.PaymentWebhookReceived) {
        await this.paymentService.processPaymentWebhookEvent(
          parsedMessage.payload,
        );
      }

      channel.ack(msg);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to process webhook message: ${err.message}`,
        err.stack,
      );
      this.handleProcessingError(msg, err, channel);
    }
  }

  private handleProcessingError(
    msg: amqplib.ConsumeMessage,
    err: Error,
    channel: amqplib.Channel,
  ): void {
    const headers = (msg.properties.headers as Record<string, unknown>) || {};
    const retryCount = (Number(headers[X_RETRY_COUNT]) || 0) + 1;

    let targetQueue: string | null = null;
    if (retryCount === 1) {
      targetQueue = WEBHOOK_RETRY_QUEUE_5S;
    } else if (retryCount === 2) {
      targetQueue = WEBHOOK_RETRY_QUEUE_30S;
    } else if (retryCount === 3) {
      targetQueue = WEBHOOK_RETRY_QUEUE_2M;
    }

    if (targetQueue) {
      this.logger.warn(
        `Webhook processing failed (attempt ${retryCount}). Re-queueing to ${targetQueue} for retry: ${err.message}`,
      );
      channel.sendToQueue(targetQueue, msg.content, {
        headers: {
          ...headers,
          [X_RETRY_COUNT]: retryCount,
        },
      });
      channel.ack(msg);
    } else {
      this.logger.error(
        `Webhook processing failed after ${retryCount - 1} retries. Routing to Dead Letter Queue: ${err.message}`,
        err.stack,
      );
      channel.nack(msg, false, false);
    }
  }

  async onModuleDestroy() {
    if (this.channelWrapper) {
      await this.channelWrapper.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}
