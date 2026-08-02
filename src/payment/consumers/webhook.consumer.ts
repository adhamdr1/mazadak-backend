import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { PAYMENTS_WEBHOOK_QUEUE } from '../../infrastructure/rabbitmq/rabbitmq.constants';
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
          this.logger.error(
            `Failed to process webhook message: ${err.message}`,
            err.stack,
          );
          // Reject and do not requeue to route it to Dead Letter Queue (DLQ)
          this.channel?.nack(msg, false, false);
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

  async onModuleDestroy() {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}
