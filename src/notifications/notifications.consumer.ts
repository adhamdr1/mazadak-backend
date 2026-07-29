import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsumeMessage } from 'amqplib';
import * as amqplib from 'amqplib';
import * as amqpManager from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { NotificationsService } from './notifications.service';
import { UsersService } from '../users/users.service';
import {
  IDEMPOTENCY_KEY_PREFIX,
  IDEMPOTENCY_TTL_S,
} from '../infrastructure/rabbitmq/rabbitmq.constants';
import {
  RabbitMQEvent,
  RabbitMQParsedMessage,
  AuctionStartedPayload,
  AuctionEndedPayload,
  BidPlacedPayload,
  UserRegisteredPayload,
  EmailVerifiedPayload,
  PasswordResetPayload,
  PasswordChangedPayload,
} from '../infrastructure/rabbitmq/rabbitmq-event.types';

@Injectable()
export class NotificationsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsConsumer.name);
  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;
  private readonly queueName = 'notifications.queue';

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    // 1. Connection Recovery implementation using amqp-connection-manager
    this.connection = amqpManager.connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('Connected to RabbitMQ!');
    });
    this.connection.on('disconnect', (params: { err: Error }) => {
      this.logger.warn(
        `Disconnected from RabbitMQ: ${params.err.message}. Reconnecting...`,
      );
    });

    this.channelWrapper = this.connection.createChannel({
      setup: (channel: amqplib.Channel) => {
        // We only assert prefetch and consume, queues are asserted by SetupService
        return Promise.all([
          channel.prefetch(10),
          channel.consume(
            this.queueName,
            (msg: ConsumeMessage | null) => {
              if (msg) {
                this.handleMessage(msg).catch((error: unknown) => {
                  this.logger.error(
                    `Unhandled error processing message: ${error instanceof Error ? error.message : String(error)}`,
                  );
                  channel.nack(msg, false, false);
                });
              }
            },
            { noAck: false },
          ),
        ]);
      },
    });

    this.logger.log(`NotificationsConsumer listening on ${this.queueName}`);
  }

  async onModuleDestroy() {
    if (this.channelWrapper) {
      await this.channelWrapper.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();

      // 3. Strong Typing applied
      const parsed = JSON.parse(content) as RabbitMQParsedMessage;
      const { messageId } = parsed;

      // 2. Constants used
      const idempotencyKey = `${IDEMPOTENCY_KEY_PREFIX}${messageId}`;
      const isDuplicate = await this.redis.get(idempotencyKey);

      if (isDuplicate) {
        this.logger.warn(
          `Duplicate message detected and skipped: ${messageId}`,
        );
        this.channelWrapper!.ack(msg);
        return;
      }

      this.logger.log(
        `Processing event ${parsed.eventType} (Msg: ${messageId})`,
      );

      // Strong typing automatically infers payload in each case!
      switch (parsed.eventType) {
        case RabbitMQEvent.AuctionStarted:
          await this.handleAuctionStarted(parsed.payload);
          break;
        case RabbitMQEvent.AuctionEnded:
          await this.handleAuctionEnded(parsed.payload);
          break;
        case RabbitMQEvent.BidPlaced:
          await this.handleBidPlaced(parsed.payload);
          break;
        case RabbitMQEvent.UserRegistered:
          await this.handleUserRegistered(parsed.payload);
          break;
        case RabbitMQEvent.EmailVerified:
          await this.handleEmailVerified(parsed.payload);
          break;
        case RabbitMQEvent.PasswordReset:
          await this.handlePasswordReset(parsed.payload);
          break;
        case RabbitMQEvent.PasswordChanged:
          await this.handlePasswordChanged(parsed.payload);
          break;
        case RabbitMQEvent.WalletDeposited:
        case RabbitMQEvent.WithdrawalCompleted:
        case RabbitMQEvent.AuctionCancelled:
          // Currently no email side-effect for these
          break;
        default: {
          const unknownEvent = (parsed as { eventType?: string }).eventType;
          this.logger.warn(
            `Unhandled event type in notifications consumer: ${String(unknownEvent)}`,
          );
        }
      }

      // Mark as processed in Redis using constant TTL
      await this.redis.set(
        idempotencyKey,
        'processed',
        'EX',
        IDEMPOTENCY_TTL_S,
      );

      this.channelWrapper!.ack(msg);
      this.logger.log(`Successfully processed event ${parsed.eventType}`);
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.channelWrapper!.nack(msg, false, false);
    }
  }

  // --- Event Handlers ---

  private async handleAuctionStarted(payload: AuctionStartedPayload) {
    const seller = await this.usersService.findById(payload.sellerId);
    if (!seller) return;

    const name =
      [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
    await this.notificationsService.sendAuctionStartedSellerEmail(
      seller.email,
      name,
      payload.auctionTitle,
      payload.auctionId,
    );
  }

  private async handleAuctionEnded(payload: AuctionEndedPayload) {
    const seller = await this.usersService.findById(payload.sellerId);
    if (seller) {
      const sellerName =
        [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
      await this.notificationsService.sendAuctionEndedSellerEmail(
        seller.email,
        sellerName,
        payload.auctionTitle,
        payload.finalPrice,
        payload.winnerName || null,
        payload.auctionId,
        payload.depositTransactionId,
      );
    }

    if (payload.winnerId) {
      const winner = await this.usersService.findById(payload.winnerId);
      if (winner) {
        const winnerName =
          [winner.firstName, winner.lastName].filter(Boolean).join(' ') ||
          'User';
        await this.notificationsService.sendAuctionWonEmail(
          winner.email,
          winnerName,
          payload.auctionTitle,
          payload.finalPrice,
          payload.auctionId,
          payload.captureTransactionId,
        );
      }
    }
  }

  private async handleBidPlaced(payload: BidPlacedPayload) {
    if (!payload.outbidUserId) return;

    const previousBidder = await this.usersService.findById(
      payload.outbidUserId,
    );
    if (!previousBidder) return;

    const name =
      [previousBidder.firstName, previousBidder.lastName]
        .filter(Boolean)
        .join(' ') || 'User';
    await this.notificationsService.sendOutbidEmail(
      previousBidder.email,
      name,
      payload.auctionTitle,
      payload.amount,
      payload.auctionId,
      payload.outbidTransactionId,
    );
  }

  private async handleUserRegistered(payload: UserRegisteredPayload) {
    await this.notificationsService.sendEmailVerification(
      payload.email,
      payload.verificationToken,
      payload.name,
      payload.phone,
    );
  }

  private async handleEmailVerified(payload: EmailVerifiedPayload) {
    await this.notificationsService.sendWelcomeEmail(
      payload.email,
      payload.name,
    );
  }

  private async handlePasswordReset(payload: PasswordResetPayload) {
    const nameParts = payload.name.split(' ');
    await this.notificationsService.sendPasswordResetEmail(
      payload.email,
      payload.resetToken,
      { firstName: nameParts[0] || 'User', lastName: nameParts[1] },
      payload.metadata,
    );
  }

  private async handlePasswordChanged(payload: PasswordChangedPayload) {
    await this.notificationsService.sendPasswordChangedEmail(
      payload.email,
      payload.name,
      payload.date,
    );
  }
}
