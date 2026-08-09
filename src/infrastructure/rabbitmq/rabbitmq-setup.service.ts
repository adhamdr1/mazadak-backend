import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import {
  MAZADAK_EXCHANGE,
  NOTIFICATIONS_QUEUE,
  DEAD_LETTER_QUEUE,
  RETRY_QUEUE_5S,
  RETRY_QUEUE_30S,
  RETRY_QUEUE_2M,
  PAYMENTS_WEBHOOK_QUEUE,
  AUTH_QUEUE,
  WALLET_QUEUE,
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

      // ── 3. Retry Queues (TTL → DLX back to main exchange) ─────────────────
      // Each retry queue has a TTL; expired messages re-enter the main exchange.
      const retryQueues: [string, number][] = [
        [RETRY_QUEUE_5S, 5_000],
        [RETRY_QUEUE_30S, 30_000],
        [RETRY_QUEUE_2M, 120_000],
      ];

      for (const [queueName, ttl] of retryQueues) {
        await channel.assertQueue(queueName, {
          durable: true,
          arguments: {
            // After TTL expires, re-route to the main exchange
            'x-dead-letter-exchange': MAZADAK_EXCHANGE,
            'x-message-ttl': ttl,
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
        'PaymentWebhookReceived',
      );

      // ── 7. Auth Queue ─────────────────────────────────────────────────────
      await channel.assertQueue(AUTH_QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
        },
      });
      await channel.bindQueue(AUTH_QUEUE, MAZADAK_EXCHANGE, 'UserBanned');

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
        'WalletDepositInitiated',
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
