import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import * as amqpManager from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { RabbitMQEvent } from './rabbitmq-event.types';
import {
  MAZADAK_EXCHANGE,
  NOTIFICATIONS_QUEUE,
  DEAD_LETTER_QUEUE,
  PAYMENTS_WEBHOOK_QUEUE,
  AUTH_QUEUE,
  WALLET_QUEUE,
  WALLET_RETRY_QUEUE_5S,
  AUTH_RETRY_QUEUE_5S,
  WEBHOOK_RETRY_QUEUE_5S,
  WEBHOOK_RETRY_QUEUE_30S,
  WEBHOOK_RETRY_QUEUE_2M,
  NOTIFICATIONS_RETRY_QUEUE_5S,
  NOTIFICATIONS_RETRY_QUEUE_30S,
  NOTIFICATIONS_RETRY_QUEUE_2M,
  NOTIFICATIONS_RETRY_ROUTING_KEY,
  AUCTION_QUEUE,
  AUCTION_RETRY_QUEUE_5S,
  AUCTION_RETRY_ROUTING_KEY,
} from './rabbitmq.constants';

/**
 * Declares the full RabbitMQ topology (Exchange + Queues + Bindings)
 * on application startup and automatically re-asserts it on connection recovery.
 */
@Injectable()
export class RabbitMQSetupService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMQSetupService.name);
  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    try {
      this.connection = amqpManager.connect([url]);

      this.connection.on('connect', () => {
        this.logger.log(
          'RabbitMQSetupService connected — topology will be asserted',
        );
      });

      this.connection.on('disconnect', (params: { err: Error }) => {
        this.logger.warn(
          `RabbitMQSetupService disconnected: ${params.err.message}. Will re-assert topology on reconnect.`,
        );
      });

      this.channelWrapper = this.connection.createChannel({
        setup: async (channel: amqplib.Channel) => {
          await this.assertTopology(channel);
          this.logger.log('RabbitMQ topology asserted successfully');
        },
      });

      await this.channelWrapper.waitForConnect().catch((err: unknown) => {
        this.logger.warn(
          `Initial RabbitMQ connection pending/failed: ${err instanceof Error ? err.message : String(err)}. Connection manager will retry in background.`,
        );
      });
    } catch (err) {
      this.logger.error(
        `RabbitMQ setup bootstrap error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  public async assertTopology(channel: amqplib.Channel): Promise<void> {
    // ── 1. Main Exchange ──────────────────────────────────────────────────
    await channel.assertExchange(MAZADAK_EXCHANGE, 'topic', {
      durable: true,
    });

    // ── 2. Dead Letter Queue ──────────────────────────────────────────────
    await channel.assertQueue(DEAD_LETTER_QUEUE, {
      durable: true,
    });

    // ── 3. Queue-Specific Retry Queues ──────────────────────────────────
    const queueRetryConfigs: { queue: string; ttl: number; dlk: string }[] = [
      // Wallet Retry
      {
        queue: WALLET_RETRY_QUEUE_5S,
        ttl: 5_000,
        dlk: RabbitMQEvent.WalletDepositInitiated,
      },
      // Auth Retry
      {
        queue: AUTH_RETRY_QUEUE_5S,
        ttl: 5_000,
        dlk: RabbitMQEvent.UserBanned,
      },
      // Webhook Retries
      {
        queue: WEBHOOK_RETRY_QUEUE_5S,
        ttl: 5_000,
        dlk: RabbitMQEvent.PaymentWebhookReceived,
      },
      {
        queue: WEBHOOK_RETRY_QUEUE_30S,
        ttl: 30_000,
        dlk: RabbitMQEvent.PaymentWebhookReceived,
      },
      {
        queue: WEBHOOK_RETRY_QUEUE_2M,
        ttl: 120_000,
        dlk: RabbitMQEvent.PaymentWebhookReceived,
      },
      // Notifications Retries
      {
        queue: NOTIFICATIONS_RETRY_QUEUE_5S,
        ttl: 5_000,
        dlk: NOTIFICATIONS_RETRY_ROUTING_KEY,
      },
      {
        queue: NOTIFICATIONS_RETRY_QUEUE_30S,
        ttl: 30_000,
        dlk: NOTIFICATIONS_RETRY_ROUTING_KEY,
      },
      {
        queue: NOTIFICATIONS_RETRY_QUEUE_2M,
        ttl: 120_000,
        dlk: NOTIFICATIONS_RETRY_ROUTING_KEY,
      },
      // Auctions Retry
      {
        queue: AUCTION_RETRY_QUEUE_5S,
        ttl: 5_000,
        dlk: AUCTION_RETRY_ROUTING_KEY,
      },
    ];

    for (const config of queueRetryConfigs) {
      await channel.assertQueue(config.queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': MAZADAK_EXCHANGE,
          'x-dead-letter-routing-key': config.dlk,
          'x-message-ttl': config.ttl,
        },
      });
    }

    // ── 4. Notifications Queue ────────────────────────────────────────────
    await channel.assertQueue(NOTIFICATIONS_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
      },
    });

    // ── 5. Notification Queue Bindings ─────────────────────────────────────
    // Unbind wildcard '#' if previously bound, then bind each explicit event
    await channel
      .unbindQueue(NOTIFICATIONS_QUEUE, MAZADAK_EXCHANGE, '#')
      .catch(() => undefined);

    const notificationRoutingKeys: string[] = [
      RabbitMQEvent.AuctionStarted,
      RabbitMQEvent.AuctionEnded,
      RabbitMQEvent.BidPlaced,
      RabbitMQEvent.AutoBidPlaced,
      RabbitMQEvent.AutoBidExhausted,
      RabbitMQEvent.AuctionCancelledByAdmin,
      RabbitMQEvent.AuctionCancelled,
      RabbitMQEvent.UserRegistered,
      RabbitMQEvent.EmailVerified,
      RabbitMQEvent.PasswordReset,
      RabbitMQEvent.PasswordChanged,
      RabbitMQEvent.WalletDeposited,
      RabbitMQEvent.WithdrawalCompleted,
      RabbitMQEvent.AccountReactivationRequested,
      RabbitMQEvent.AccountReactivated,
      RabbitMQEvent.ChatMessageSent,
      RabbitMQEvent.ReviewPublished,
      RabbitMQEvent.ReviewReplied,
      RabbitMQEvent.EscrowCreated,
      RabbitMQEvent.EscrowReleased,
      RabbitMQEvent.EscrowRefunded,
      RabbitMQEvent.DisputeOpened,
      RabbitMQEvent.DisputeResolved,
      RabbitMQEvent.DisputeCancelled,
      NOTIFICATIONS_RETRY_ROUTING_KEY,
    ];

    for (const routingKey of notificationRoutingKeys) {
      await channel.bindQueue(
        NOTIFICATIONS_QUEUE,
        MAZADAK_EXCHANGE,
        routingKey,
      );
    }

    // ── 6. Payments Webhook Queue ─────────────────────────────────────────
    await channel.assertQueue(PAYMENTS_WEBHOOK_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
      },
    });
    await channel.bindQueue(
      PAYMENTS_WEBHOOK_QUEUE,
      MAZADAK_EXCHANGE,
      RabbitMQEvent.PaymentWebhookReceived,
    );

    // ── 7. Auth Queue ─────────────────────────────────────────────────────
    await channel.assertQueue(AUTH_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
      },
    });
    await channel.bindQueue(
      AUTH_QUEUE,
      MAZADAK_EXCHANGE,
      RabbitMQEvent.UserBanned,
    );

    // ── 8. Wallet Queue ───────────────────────────────────────────────────
    await channel.assertQueue(WALLET_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
      },
    });
    await channel.bindQueue(
      WALLET_QUEUE,
      MAZADAK_EXCHANGE,
      RabbitMQEvent.WalletDepositInitiated,
    );

    // ── 9. Auctions Queue ───────────────────────────────────────────────────
    await channel.assertQueue(AUCTION_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
      },
    });
    await channel.bindQueue(
      AUCTION_QUEUE,
      MAZADAK_EXCHANGE,
      RabbitMQEvent.UserBanned,
    );
    await channel.bindQueue(
      AUCTION_QUEUE,
      MAZADAK_EXCHANGE,
      RabbitMQEvent.UserSoftDeleted,
    );
    await channel.bindQueue(
      AUCTION_QUEUE,
      MAZADAK_EXCHANGE,
      AUCTION_RETRY_ROUTING_KEY,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channelWrapper) {
      await this.channelWrapper.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}
