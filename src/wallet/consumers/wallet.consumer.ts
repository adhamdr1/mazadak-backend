import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConsumeMessage } from 'amqplib';
import * as amqplib from 'amqplib';
import * as amqpManager from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { type IWalletRepository } from '../interfaces/wallet.repository.interface';
import { WalletNotFoundException } from '../exceptions/wallet-not-found.exception';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import {
  IDEMPOTENCY_KEY_PREFIX,
  IDEMPOTENCY_TTL_S,
  WALLET_QUEUE,
  X_RETRY_COUNT,
  RETRY_QUEUE_5S,
} from '../../infrastructure/rabbitmq/rabbitmq.constants';
import {
  RabbitMQEvent,
  RabbitMQParsedMessage,
  WalletDepositInitiatedPayload,
} from '../../infrastructure/rabbitmq/rabbitmq-event.types';

@Injectable()
export class WalletConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WalletConsumer.name);
  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;
  private readonly queueName = WALLET_QUEUE;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
    @InjectConnection() private readonly mongooseConnection: Connection,
  ) {}

  onModuleInit() {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = amqpManager.connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('WalletConsumer connected to RabbitMQ!');
    });
    this.connection.on('disconnect', (params: { err: Error }) => {
      this.logger.warn(
        `WalletConsumer disconnected from RabbitMQ: ${params.err.message}. Reconnecting...`,
      );
    });

    this.channelWrapper = this.connection.createChannel({
      setup: (channel: amqplib.Channel) => {
        return Promise.all([
          channel.prefetch(1), // Webhook/Payment processing is prefetch(1) for strict sequence/concurrency lock
          channel.consume(
            this.queueName,
            (msg: ConsumeMessage | null) => {
              if (msg) {
                this.handleMessage(msg, channel).catch((error: unknown) => {
                  this.logger.error(
                    `Unhandled error in WalletConsumer message: ${error instanceof Error ? error.message : String(error)}`,
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

    this.logger.log(`WalletConsumer listening on ${this.queueName}`);
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
    try {
      const content = msg.content.toString();
      const raw = JSON.parse(content) as unknown;

      const parsed = (
        raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw
      ) as RabbitMQParsedMessage;

      if (!parsed) {
        this.logger.warn(
          'WalletConsumer received empty or invalid message payload',
        );
        this.channelWrapper!.ack(msg);
        return;
      }

      const { messageId } = parsed;
      const idempotencyKey = `${IDEMPOTENCY_KEY_PREFIX}${messageId}`;
      const isDuplicate = await this.redis.get(idempotencyKey);

      if (isDuplicate) {
        this.logger.warn(
          `WalletConsumer detected duplicate message and skipped: ${messageId}`,
        );
        this.channelWrapper!.ack(msg);
        return;
      }

      this.logger.log(
        `WalletConsumer processing event ${parsed.eventType} (Msg: ${messageId})`,
      );

      switch (parsed.eventType) {
        case RabbitMQEvent.WalletDepositInitiated:
          await this.handleWalletDepositInitiated(parsed.payload);
          break;
        default:
          this.logger.warn(
            `WalletConsumer received unhandled event type: ${parsed.eventType}`,
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
        `WalletConsumer successfully processed event ${parsed.eventType}`,
      );
    } catch (error) {
      this.logger.error(
        `WalletConsumer error processing message: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.handleProcessingError(msg, error as Error, channel);
    }
  }

  private async handleWalletDepositInitiated(
    payload: WalletDepositInitiatedPayload,
  ): Promise<void> {
    const session = await this.mongooseConnection.startSession();
    try {
      session.startTransaction();

      this.logger.log(
        `WalletConsumer crediting balance for walletId: ${payload.walletId}, amount: ${payload.amount}`,
      );

      const wallet = await this.walletRepository.creditBalance(
        payload.walletId,
        payload.amount,
        session,
      );

      if (!wallet) {
        throw new WalletNotFoundException();
      }

      // Publish the final WalletDeposited event containing the userId for the notification queue
      await this.outboxService.saveEvent(
        RabbitMQEvent.WalletDeposited,
        {
          userId: wallet.userId.toString(),
          amount: payload.amount,
          transactionId: payload.transactionId,
        },
        session,
        payload.transactionId, // correlationId
      );

      await session.commitTransaction();
      this.logger.log(
        `Successfully credited wallet ${payload.walletId} and published WalletDeposited event`,
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
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
        `WalletConsumer message exceeded max retries. Sending to dead-letter queue. Error: ${err.message}`,
      );
      channel.reject(msg, false); // Rejects to DLQ (no requeue)
    } else {
      this.logger.warn(
        `WalletConsumer processing failed (attempt ${retryCount}). Retrying in 5 seconds...`,
      );
      channel.ack(msg); // Acknowledge first before republishing to retry queue
      channel.sendToQueue(RETRY_QUEUE_5S, msg.content, {
        headers: {
          ...headers,
          [X_RETRY_COUNT]: retryCount,
        },
      });
    }
  }
}
