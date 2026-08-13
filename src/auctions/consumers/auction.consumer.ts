import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsumeMessage } from 'amqplib';
import * as amqplib from 'amqplib';
import * as amqpManager from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AuctionsService } from '../auctions.service';
import {
  IDEMPOTENCY_KEY_PREFIX,
  IDEMPOTENCY_TTL_S,
  AUCTION_QUEUE,
  X_RETRY_COUNT,
  AUCTION_RETRY_QUEUE_5S,
} from '../../infrastructure/rabbitmq/rabbitmq.constants';
import {
  RabbitMQEvent,
  RabbitMQParsedMessage,
  UserBannedPayload,
  UserSoftDeletedPayload,
} from '../../infrastructure/rabbitmq/rabbitmq-event.types';

@Injectable()
export class AuctionConsumer
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AuctionConsumer.name);
  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;
  private readonly queueName = AUCTION_QUEUE;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly auctionsService: AuctionsService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = amqpManager.connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('AuctionConsumer connected to RabbitMQ!');
    });
    this.connection.on('disconnect', (params: { err: Error }) => {
      this.logger.warn(
        `AuctionConsumer disconnected from RabbitMQ: ${params.err.message}. Reconnecting...`,
      );
    });

    this.channelWrapper = this.connection.createChannel({
      setup: (channel: amqplib.Channel) => {
        return Promise.all([
          channel.prefetch(10),
          channel.consume(
            this.queueName,
            (msg: ConsumeMessage | null) => {
              if (msg) {
                this.handleMessage(msg, channel).catch((error: unknown) => {
                  this.logger.error(
                    `Unhandled error in AuctionConsumer message: ${error instanceof Error ? error.message : String(error)}`,
                  );
                  this.handleProcessingError(msg, error as Error, channel);
                });
              }
            },
            { noAck: false },
          ),
        ]);
      },
    });

    this.logger.log(`AuctionConsumer listening on ${this.queueName}`);
  }

  async onModuleDestroy() {
    if (this.channelWrapper) {
      await this.channelWrapper.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async handleMessage(
    msg: ConsumeMessage,
    channel: amqplib.Channel,
  ): Promise<void> {
    let parsed: RabbitMQParsedMessage;
    try {
      const content = msg.content.toString();
      const raw = JSON.parse(content) as unknown;
      parsed = (
        raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw
      ) as RabbitMQParsedMessage;
    } catch (parseError) {
      this.logger.error(
        `AuctionConsumer failed to parse message JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Rejecting to DLQ immediately.`,
      );
      channel.reject(msg, false);
      return;
    }

    try {
      if (!parsed) {
        this.logger.warn(
          'AuctionConsumer received empty or invalid message payload',
        );
        channel.ack(msg);
        return;
      }

      const { messageId } = parsed;
      const idempotencyKey = `${IDEMPOTENCY_KEY_PREFIX}${messageId}`;
      const isDuplicate = await this.redis.get(idempotencyKey);

      if (isDuplicate) {
        this.logger.warn(
          `AuctionConsumer detected duplicate message and skipped: ${messageId}`,
        );
        channel.ack(msg);
        return;
      }

      this.logger.log(
        `AuctionConsumer processing event ${parsed.eventType} (Msg: ${messageId})`,
      );

      switch (parsed.eventType) {
        case RabbitMQEvent.UserBanned:
          await this.handleUserBanned(parsed.payload);
          break;
        case RabbitMQEvent.UserSoftDeleted:
          await this.handleUserSoftDeleted(parsed.payload);
          break;
        default:
          this.logger.warn(
            `AuctionConsumer received unhandled event type: ${parsed.eventType}`,
          );
      }

      await this.redis.set(
        idempotencyKey,
        'processed',
        'EX',
        IDEMPOTENCY_TTL_S,
      );

      channel.ack(msg);
      this.logger.log(
        `AuctionConsumer successfully processed event ${parsed.eventType}`,
      );
    } catch (error) {
      this.logger.error(
        `AuctionConsumer error processing message: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.handleProcessingError(msg, error as Error, channel);
    }
  }

  private async handleUserBanned(payload: UserBannedPayload): Promise<void> {
    this.logger.log(
      `AuctionConsumer handling ban event for seller: ${payload.userId}`,
    );
    await this.auctionsService.cancelAllActiveAuctionsForSeller(payload.userId);
  }

  private async handleUserSoftDeleted(
    payload: UserSoftDeletedPayload,
  ): Promise<void> {
    this.logger.log(
      `AuctionConsumer handling soft-delete event for seller: ${payload.userId}`,
    );
    await this.auctionsService.cancelAllActiveAuctionsForSeller(payload.userId);
  }

  private handleProcessingError(
    msg: ConsumeMessage,
    err: Error,
    channel: amqplib.Channel,
  ): void {
    const headers = (msg.properties.headers as Record<string, unknown>) || {};
    const retryCount = (Number(headers[X_RETRY_COUNT]) || 0) + 1;

    if (retryCount > 3) {
      this.logger.error(
        `AuctionConsumer message exceeded max retries. Sending to dead-letter queue. Error: ${err.message}`,
      );
      channel.reject(msg, false); // Rejects to DLQ (no requeue)
    } else {
      this.logger.warn(
        `AuctionConsumer processing failed (attempt ${retryCount}). Retrying in 5 seconds...`,
      );
      channel.ack(msg); // Acknowledge first before republishing to retry queue
      channel.sendToQueue(AUCTION_RETRY_QUEUE_5S, msg.content, {
        headers: {
          ...headers,
          [X_RETRY_COUNT]: retryCount,
        },
      });
    }
  }
}
