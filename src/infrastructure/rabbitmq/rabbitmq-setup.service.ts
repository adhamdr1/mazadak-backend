import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
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
} from './rabbitmq.constants';

/**
 * Declares the full RabbitMQ topology (Exchange + Queues + Bindings)
 * on application startup. Safe to run multiple times (idempotent asserts).
 */
@Injectable()
export class RabbitMQSetupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RabbitMQSetupService.name);

  constructor(private readonly configService: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    let connection: amqplib.ChannelModel | undefined;
    let channel: amqplib.Channel | undefined;

    try {
      connection = await amqplib.connect(url);
      channel = await connection.createChannel();

      // ── 1. Main Exchange ──────────────────────────────────────────────────
      await channel.assertExchange(MAZADAK_EXCHANGE, 'topic', {
        durable: true,
      });

      // ── 2. Dead Letter Queue ──────────────────────────────────────────────
      await channel.assertQueue(DEAD_LETTER_QUEUE, {
        durable: true,
      });

      // ── 3. Queue-Specific Retry Queues (TTL → DLX back to main exchange with proper routing keys) ──
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
      // Messages that exhaust all retries go to the DLQ.
      await channel.assertQueue(NOTIFICATIONS_QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
        },
      });

      // ── 5. Bindings ───────────────────────────────────────────────────────
      await channel.bindQueue(NOTIFICATIONS_QUEUE, MAZADAK_EXCHANGE, '#');
      await channel.bindQueue(
        NOTIFICATIONS_QUEUE,
        MAZADAK_EXCHANGE,
        NOTIFICATIONS_RETRY_ROUTING_KEY,
      );

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

      this.logger.log('RabbitMQ topology asserted successfully');
    } catch (err) {
      this.logger.error(
        `RabbitMQ setup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Do NOT rethrow — app can start without RabbitMQ (outbox will handle events)
    } finally {
      await channel?.close().catch(() => undefined);
      await connection?.close().catch(() => undefined);
    }
  }
}
