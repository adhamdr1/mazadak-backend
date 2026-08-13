import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as amqpManager from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import { MAZADAK_EXCHANGE } from './rabbitmq.constants';
import { RabbitMQEvent, RabbitMQEventPayload } from './rabbitmq-event.types';
import { RabbitMQMessage } from './rabbitmq-message.interface';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');
    this.connection = amqpManager.connect([url]);
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: (channel: amqplib.Channel) => {
        return channel.assertExchange(MAZADAK_EXCHANGE, 'topic', {
          durable: true,
        });
      },
    });
  }

  async publish(
    eventType: RabbitMQEvent,
    payload: RabbitMQEventPayload,
    correlationId?: string,
    messageId?: string,
  ): Promise<void> {
    const message: RabbitMQMessage = {
      messageId: messageId ?? randomUUID(),
      correlationId: correlationId ?? randomUUID(),
      eventType,
      version: 'v1',
      timestamp: new Date().toISOString(),
      payload,
    };

    const wrappedMessage = {
      pattern: { exchange: MAZADAK_EXCHANGE, routingKey: eventType },
      data: message,
    };

    try {
      if (!this.channelWrapper) {
        throw new Error('RabbitMQ channel wrapper is not initialized');
      }

      await this.channelWrapper.publish(
        MAZADAK_EXCHANGE,
        eventType,
        wrappedMessage,
        { persistent: true },
      );

      this.logger.debug(
        `Published [${eventType}] messageId=${message.messageId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to publish [${eventType}]: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
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
