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
  AuctionCancelledByAdminPayload,
  AuctionCancelledPayload,
  WalletDepositedPayload,
  WithdrawalCompletedPayload,
} from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { InAppNotificationType } from './in-app/enums/in-app-notification-type.enum';
import { NotificationReferenceType } from './in-app/enums/notification-reference-type.enum';

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
      const raw = JSON.parse(content) as unknown;

      // NestJS ClientProxy wraps the payload in a { pattern, data } structure by default.
      // We extract the inner data if it exists.
      const parsed = (
        raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw
      ) as RabbitMQParsedMessage;

      if (!parsed) {
        this.logger.warn('Received empty or invalid message payload');
        this.channelWrapper!.ack(msg);
        return;
      }

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
        case RabbitMQEvent.AuctionCancelledByAdmin:
          await this.handleAuctionCancelledByAdmin(parsed.payload);
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
          await this.handleWalletDeposited(parsed.payload);
          break;
        case RabbitMQEvent.WithdrawalCompleted:
          await this.handleWithdrawalCompleted(parsed.payload);
          break;
        case RabbitMQEvent.AuctionCancelled:
          await this.handleAuctionCancelled(parsed.payload);
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

    // Email
    await this.notificationsService.sendAuctionStartedSellerEmail(
      seller.email,
      name,
      payload.auctionTitle,
      payload.auctionId,
    );

    // In-App Notification
    await this.notificationsService.createInAppNotification({
      userId: payload.sellerId,
      type: InAppNotificationType.AUCTION_STARTED,
      title: 'Your auction is now LIVE! 🚀',
      body: `Your auction "${payload.auctionTitle}" is now live and accepting bids.`,
      referenceId: payload.auctionId,
      referenceType: NotificationReferenceType.AUCTION,
    });
  }

  private async handleAuctionCancelled(payload: AuctionCancelledPayload) {
    const seller = await this.usersService.findById(payload.sellerId);
    if (seller) {
      const name =
        [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
      // Email for seller
      await this.notificationsService.sendAuctionCancelledEmail(
        seller.email,
        name,
        payload.auctionTitle,
        payload.auctionId,
      );

      // In-app Notification for Seller
      await this.notificationsService.createInAppNotification({
        userId: payload.sellerId,
        type: InAppNotificationType.AUCTION_CANCELLED,
        title: 'Auction Cancelled ❌',
        body: `You have successfully cancelled your auction "${payload.auctionTitle}".`,
        referenceId: payload.auctionId,
        referenceType: NotificationReferenceType.AUCTION,
      });
    }

    // Notify highest bidder if any
    if (payload.highestBidderId && payload.refundAmount !== undefined) {
      const bidder = await this.usersService.findById(payload.highestBidderId);
      if (bidder) {
        const bidderName =
          [bidder.firstName, bidder.lastName].filter(Boolean).join(' ') ||
          'User';

        // Email for highest bidder
        await this.notificationsService.sendAuctionCancelledToBidderEmail(
          bidder.email,
          bidderName,
          payload.auctionTitle,
          payload.auctionId,
          'The seller cancelled the auction.',
          payload.refundAmount,
        );

        // In-app Notification for highest bidder
        await this.notificationsService.createInAppNotification({
          userId: payload.highestBidderId,
          type: InAppNotificationType.AUCTION_CANCELLED,
          title: 'Auction Cancelled ❌',
          body: `The auction "${payload.auctionTitle}" has been cancelled and your held funds of ${payload.refundAmount} EGP have been released.`,
          referenceId: payload.auctionId,
          referenceType: NotificationReferenceType.AUCTION,
        });
      }
    }
  }

  private async handleAuctionCancelledByAdmin(
    payload: AuctionCancelledByAdminPayload,
  ) {
    const seller = await this.usersService.findById(payload.sellerId);
    if (seller) {
      const name =
        [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
      // Email for seller
      await this.notificationsService.sendAuctionCancelledByAdminEmail(
        seller.email,
        name,
        payload.auctionTitle,
        payload.auctionId,
        payload.adminActionReason,
      );

      // In-app Notification for Seller
      await this.notificationsService.createInAppNotification({
        userId: payload.sellerId,
        type: InAppNotificationType.AUCTION_CANCELLED_BY_ADMIN,
        title: 'Auction Cancelled by Admin ❌',
        body: `Your auction "${payload.auctionTitle}" was cancelled by an admin. Reason: ${payload.adminActionReason}`,
        referenceId: payload.auctionId,
        referenceType: NotificationReferenceType.AUCTION,
      });
    }

    // Notify highest bidder if any
    if (payload.highestBidderId && payload.refundAmount !== undefined) {
      const bidder = await this.usersService.findById(payload.highestBidderId);
      if (bidder) {
        const bidderName =
          [bidder.firstName, bidder.lastName].filter(Boolean).join(' ') ||
          'User';

        // Email for highest bidder
        await this.notificationsService.sendAuctionCancelledToBidderEmail(
          bidder.email,
          bidderName,
          payload.auctionTitle,
          payload.auctionId,
          payload.adminActionReason,
          payload.refundAmount,
        );

        // In-app Notification for highest bidder
        await this.notificationsService.createInAppNotification({
          userId: payload.highestBidderId,
          type: InAppNotificationType.AUCTION_CANCELLED_BY_ADMIN,
          title: 'Auction Cancelled by Admin ❌',
          body: `The auction "${payload.auctionTitle}" has been cancelled by an Admin and your held funds of ${payload.refundAmount} EGP have been released. Reason: ${payload.adminActionReason}`,
          referenceId: payload.auctionId,
          referenceType: NotificationReferenceType.AUCTION,
        });
      }
    }
  }

  private async handleAuctionEnded(payload: AuctionEndedPayload) {
    const seller = await this.usersService.findById(payload.sellerId);
    if (seller) {
      const sellerName =
        [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
      // Email
      await this.notificationsService.sendAuctionEndedSellerEmail(
        seller.email,
        sellerName,
        payload.auctionTitle,
        payload.finalPrice,
        payload.winnerName || null,
        payload.auctionId,
        payload.depositTransactionId,
      );

      // In-App Notification
      await this.notificationsService.createInAppNotification({
        userId: payload.sellerId,
        type: InAppNotificationType.AUCTION_ENDED_SELLER,
        title: 'Your auction has ended 🏁',
        body: payload.winnerId
          ? `Your auction "${payload.auctionTitle}" has successfully ended. Sold for ${payload.finalPrice} EGP to ${payload.winnerName || 'Winning Bidder'}.`
          : `Your auction "${payload.auctionTitle}" has ended with no bids.`,
        referenceId: payload.auctionId,
        referenceType: NotificationReferenceType.AUCTION,
      });
    }

    if (payload.winnerId) {
      const winner = await this.usersService.findById(payload.winnerId);
      if (winner) {
        const winnerName =
          [winner.firstName, winner.lastName].filter(Boolean).join(' ') ||
          'User';

        // Email
        await this.notificationsService.sendAuctionWonEmail(
          winner.email,
          winnerName,
          payload.auctionTitle,
          payload.finalPrice,
          payload.auctionId,
          payload.captureTransactionId,
        );

        // In-App Notification
        await this.notificationsService.createInAppNotification({
          userId: payload.winnerId,
          type: InAppNotificationType.AUCTION_WON,
          title: 'Congratulations! You won! 🎉',
          body: `You won the auction "${payload.auctionTitle}" with a final bid of ${payload.finalPrice} EGP.`,
          referenceId: payload.auctionId,
          referenceType: NotificationReferenceType.AUCTION,
        });
      }
    }
  }

  private async handleBidPlaced(payload: BidPlacedPayload) {
    // 1. Notify Seller about the new bid (In-App only)
    await this.notificationsService.createInAppNotification({
      userId: payload.sellerId,
      type: InAppNotificationType.NEW_BID,
      title: 'New bid placed! 📈',
      body: `Someone placed a bid of ${payload.amount} EGP on your auction "${payload.auctionTitle}".`,
      referenceId: payload.auctionId,
      referenceType: NotificationReferenceType.AUCTION,
    });

    // 2. Notify previous winner (if any) that they were outbid
    if (!payload.outbidUserId) return;

    const previousBidder = await this.usersService.findById(
      payload.outbidUserId,
    );
    if (!previousBidder) return;

    const name =
      [previousBidder.firstName, previousBidder.lastName]
        .filter(Boolean)
        .join(' ') || 'User';

    // Email
    await this.notificationsService.sendOutbidEmail(
      previousBidder.email,
      name,
      payload.auctionTitle,
      payload.amount,
      payload.auctionId,
      payload.outbidTransactionId,
    );

    // In-App Notification
    await this.notificationsService.createInAppNotification({
      userId: payload.outbidUserId,
      type: InAppNotificationType.OUTBID,
      title: 'You have been outbid! ⚠️',
      body: `Someone placed a higher bid of ${payload.amount} EGP on the auction "${payload.auctionTitle}".`,
      referenceId: payload.auctionId,
      referenceType: NotificationReferenceType.AUCTION,
    });
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

    await this.notificationsService.createInAppNotification({
      userId: payload.userId,
      type: InAppNotificationType.WELCOME,
      title: 'Welcome to Mazadak! 🌟',
      body: 'Your account is now fully verified. Happy bidding!',
    });
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

  private async handleWalletDeposited(payload: WalletDepositedPayload) {
    await this.notificationsService.sendDepositSuccessfulEmail(
      payload.email,
      payload.name,
      payload.amount,
      payload.transactionId,
    );

    await this.notificationsService.createInAppNotification({
      userId: payload.userId,
      type: InAppNotificationType.DEPOSIT_SUCCESSFUL,
      title: 'Deposit Successful 💰',
      body: `An amount of ${payload.amount} EGP has been credited to your wallet. Ref: ${payload.transactionId}.`,
      referenceId: payload.transactionId,
      referenceType: NotificationReferenceType.TRANSACTION,
    });
  }

  private async handleWithdrawalCompleted(payload: WithdrawalCompletedPayload) {
    await this.notificationsService.sendWithdrawalCompletedEmail(
      payload.email,
      payload.name,
      payload.amount,
      payload.transactionId,
    );

    await this.notificationsService.createInAppNotification({
      userId: payload.userId,
      type: InAppNotificationType.WITHDRAWAL_COMPLETED,
      title: 'Withdrawal Completed 💸',
      body: `An amount of ${payload.amount} EGP has been withdrawn from your wallet. Ref: ${payload.transactionId}.`,
      referenceId: payload.transactionId,
      referenceType: NotificationReferenceType.TRANSACTION,
    });
  }
}
