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
import { NotificationsService } from './notifications.service';
import { UsersService } from '../users/users.service';
import {
  IDEMPOTENCY_KEY_PREFIX,
  IDEMPOTENCY_TTL_S,
  NOTIFICATIONS_RETRY_QUEUE_5S,
  NOTIFICATIONS_RETRY_QUEUE_30S,
  NOTIFICATIONS_RETRY_QUEUE_2M,
  X_RETRY_COUNT,
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
  AccountReactivationRequestedPayload,
  AccountReactivatedPayload,
  ChatMessageSentPayload,
} from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { InAppNotificationType } from './in-app/enums/in-app-notification-type.enum';
import { NotificationReferenceType } from './in-app/enums/notification-reference-type.enum';
import { InAppNotificationTitles } from './enums/in-app-notification-title.enum';

@Injectable()
export class NotificationsConsumer
  implements OnApplicationBootstrap, OnModuleDestroy
{
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

  onApplicationBootstrap() {
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
                this.handleMessage(msg, channel).catch((error: unknown) => {
                  this.logger.error(
                    `Unhandled error processing message: ${error instanceof Error ? error.message : String(error)}`,
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
        `NotificationsConsumer failed to parse message JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Rejecting to DLQ immediately.`,
      );
      channel.reject(msg, false);
      return;
    }

    try {
      if (!parsed) {
        this.logger.warn('Received empty or invalid message payload');
        channel.ack(msg);
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
        channel.ack(msg);
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
        case RabbitMQEvent.AccountReactivationRequested:
          await this.handleAccountReactivationRequested(parsed.payload);
          break;
        case RabbitMQEvent.AccountReactivated:
          await this.handleAccountReactivated(parsed.payload);
          break;
        case RabbitMQEvent.ChatMessageSent:
          await this.handleChatMessageSent(parsed.payload);
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

      channel.ack(msg);
      this.logger.log(`Successfully processed event ${parsed.eventType}`);
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.handleProcessingError(msg, error as Error, channel);
    }
  }

  private handleProcessingError(
    msg: ConsumeMessage,
    err: Error,
    channel: amqplib.Channel,
  ): void {
    const headers = (msg.properties.headers as Record<string, unknown>) || {};
    const retryCount = (Number(headers[X_RETRY_COUNT]) || 0) + 1;

    let targetQueue: string | null = null;
    if (retryCount === 1) {
      targetQueue = NOTIFICATIONS_RETRY_QUEUE_5S;
    } else if (retryCount === 2) {
      targetQueue = NOTIFICATIONS_RETRY_QUEUE_30S;
    } else if (retryCount === 3) {
      targetQueue = NOTIFICATIONS_RETRY_QUEUE_2M;
    }

    if (targetQueue) {
      this.logger.warn(
        `Notification processing failed (attempt ${retryCount}). Re-queueing to ${targetQueue} for retry: ${err.message}`,
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
        `Notification processing failed after ${retryCount - 1} retries. Routing to Dead Letter Queue: ${err.message}`,
        err.stack,
      );
      // Reject and do not requeue to route it to Dead Letter Queue (DLQ)
      channel.nack(msg, false, false);
    }
  }

  // --- Event Handlers ---

  private async handleAuctionStarted(payload: AuctionStartedPayload) {
    const seller = await this.usersService.findByIdIncludingDeleted(
      payload.sellerId,
    );
    if (!seller || seller.isBanned) return;

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
      title: InAppNotificationTitles.AUCTION_LIVE,
      body: `Your auction "${payload.auctionTitle}" is now live and accepting bids.`,
      referenceId: payload.auctionId,
      referenceType: NotificationReferenceType.AUCTION,
    });
  }

  private async handleAuctionCancelled(payload: AuctionCancelledPayload) {
    const seller = await this.usersService.findByIdIncludingDeleted(
      payload.sellerId,
    );
    if (seller && !seller.isBanned) {
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
        title: InAppNotificationTitles.AUCTION_CANCELLED,
        body: `You have successfully cancelled your auction "${payload.auctionTitle}".`,
        referenceId: payload.auctionId,
        referenceType: NotificationReferenceType.AUCTION,
      });
    }

    // Notify highest bidder if any
    if (payload.highestBidderId && payload.refundAmount !== undefined) {
      const bidder = await this.usersService.findByIdIncludingDeleted(
        payload.highestBidderId,
      );
      if (bidder && !bidder.isBanned) {
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
          title: InAppNotificationTitles.AUCTION_CANCELLED,
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
    const seller = await this.usersService.findByIdIncludingDeleted(
      payload.sellerId,
    );
    if (seller && !seller.isBanned) {
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
        title: InAppNotificationTitles.AUCTION_CANCELLED_BY_ADMIN,
        body: `Your auction "${payload.auctionTitle}" was cancelled by an admin. Reason: ${payload.adminActionReason}`,
        referenceId: payload.auctionId,
        referenceType: NotificationReferenceType.AUCTION,
      });
    }

    // Notify highest bidder if any
    if (payload.highestBidderId && payload.refundAmount !== undefined) {
      const bidder = await this.usersService.findByIdIncludingDeleted(
        payload.highestBidderId,
      );
      if (bidder && !bidder.isBanned) {
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
          title: InAppNotificationTitles.AUCTION_CANCELLED_BY_ADMIN,
          body: `The auction "${payload.auctionTitle}" has been cancelled by an Admin and your held funds of ${payload.refundAmount} EGP have been released. Reason: ${payload.adminActionReason}`,
          referenceId: payload.auctionId,
          referenceType: NotificationReferenceType.AUCTION,
        });
      }
    }
  }

  private async handleAuctionEnded(payload: AuctionEndedPayload) {
    let winnerName = 'Winning Bidder';
    const seller = await this.usersService.findByIdIncludingDeleted(
      payload.sellerId,
    );

    if (payload.winnerId) {
      const winner = await this.usersService.findByIdIncludingDeleted(
        payload.winnerId,
      );
      if (winner && !winner.isBanned) {
        winnerName =
          [winner.firstName, winner.lastName].filter(Boolean).join(' ') ||
          'Winning Bidder';

        // Email to winner
        await this.notificationsService.sendAuctionWonEmail(
          winner.email,
          winnerName,
          payload.auctionTitle,
          payload.finalPrice,
          payload.auctionId,
          payload.captureTransactionId,
        );

        // In-App Notification to winner
        await this.notificationsService.createInAppNotification({
          userId: payload.winnerId,
          type: InAppNotificationType.AUCTION_WON,
          title: InAppNotificationTitles.AUCTION_WON,
          body: `You won the auction "${payload.auctionTitle}" with a final bid of ${payload.finalPrice} EGP.`,
          referenceId: payload.auctionId,
          referenceType: NotificationReferenceType.AUCTION,
        });
      }
    }

    if (seller && !seller.isBanned) {
      const sellerName =
        [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';
      // Email to seller
      await this.notificationsService.sendAuctionEndedSellerEmail(
        seller.email,
        sellerName,
        payload.auctionTitle,
        payload.finalPrice,
        payload.winnerId ? winnerName : null,
        payload.auctionId,
        payload.depositTransactionId,
      );

      // In-App Notification to seller
      await this.notificationsService.createInAppNotification({
        userId: payload.sellerId,
        type: InAppNotificationType.AUCTION_ENDED_SELLER,
        title: InAppNotificationTitles.AUCTION_ENDED_SELLER,
        body: payload.winnerId
          ? `Your auction "${payload.auctionTitle}" has successfully ended. Sold for ${payload.finalPrice} EGP to ${winnerName}.`
          : `Your auction "${payload.auctionTitle}" has ended with no bids.`,
        referenceId: payload.auctionId,
        referenceType: NotificationReferenceType.AUCTION,
      });
    }
  }

  private async handleBidPlaced(payload: BidPlacedPayload) {
    // 1. Notify Seller about the new bid (In-App only)
    if (await this.isUserEligibleForNotification(payload.sellerId)) {
      await this.notificationsService.createInAppNotification({
        userId: payload.sellerId,
        type: InAppNotificationType.NEW_BID,
        title: InAppNotificationTitles.NEW_BID,
        body: `Someone placed a bid of ${payload.amount} EGP on your auction "${payload.auctionTitle}".`,
        referenceId: payload.auctionId,
        referenceType: NotificationReferenceType.AUCTION,
      });
    }

    // 2. Notify previous winner (if any) that they were outbid
    if (!payload.outbidUserId) return;

    const previousBidder = await this.usersService.findByIdIncludingDeleted(
      payload.outbidUserId,
    );
    if (previousBidder && !previousBidder.isBanned) {
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
        title: InAppNotificationTitles.OUTBID,
        body: `Someone placed a higher bid of ${payload.amount} EGP on the auction "${payload.auctionTitle}".`,
        referenceId: payload.auctionId,
        referenceType: NotificationReferenceType.AUCTION,
      });
    }
  }

  private async handleUserRegistered(payload: UserRegisteredPayload) {
    if (!(await this.isUserEligibleForNotification(payload.userId))) {
      this.logger.warn(
        `Skipping UserRegistered notification for ineligible user: ${payload.userId}`,
      );
      return;
    }
    await this.notificationsService.sendEmailVerification(
      payload.email,
      payload.verificationToken,
      payload.name,
      payload.phone,
    );
  }

  private async handleEmailVerified(payload: EmailVerifiedPayload) {
    if (!(await this.isUserEligibleForNotification(payload.userId))) {
      this.logger.warn(
        `Skipping EmailVerified notification for ineligible user: ${payload.userId}`,
      );
      return;
    }
    await this.notificationsService.sendWelcomeEmail(
      payload.email,
      payload.name,
    );

    await this.notificationsService.createInAppNotification({
      userId: payload.userId,
      type: InAppNotificationType.WELCOME,
      title: InAppNotificationTitles.WELCOME,
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
    const user = await this.usersService.findByIdIncludingDeleted(
      payload.userId,
    );
    if (!user || user.isBanned) return;

    const email = user.email;
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    await this.notificationsService.sendDepositSuccessfulEmail(
      email,
      name,
      payload.amount,
      payload.transactionId,
    );

    await this.notificationsService.createInAppNotification({
      userId: payload.userId,
      type: InAppNotificationType.DEPOSIT_SUCCESSFUL,
      title: InAppNotificationTitles.DEPOSIT_SUCCESSFUL,
      body: `An amount of ${payload.amount} EGP has been credited to your wallet. Ref: ${payload.transactionId}.`,
      referenceId: payload.transactionId,
      referenceType: NotificationReferenceType.TRANSACTION,
    });
  }

  private async handleWithdrawalCompleted(payload: WithdrawalCompletedPayload) {
    const user = await this.usersService.findByIdIncludingDeleted(
      payload.userId,
    );
    if (!user || user.isBanned) return;

    const email = user.email;
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    await this.notificationsService.sendWithdrawalCompletedEmail(
      email,
      name,
      payload.amount,
      payload.transactionId,
    );

    await this.notificationsService.createInAppNotification({
      userId: payload.userId,
      type: InAppNotificationType.WITHDRAWAL_COMPLETED,
      title: InAppNotificationTitles.WITHDRAWAL_COMPLETED,
      body: `An amount of ${payload.amount} EGP has been withdrawn from your wallet. Ref: ${payload.transactionId}.`,
      referenceId: payload.transactionId,
      referenceType: NotificationReferenceType.TRANSACTION,
    });
  }

  private async handleAccountReactivationRequested(
    payload: AccountReactivationRequestedPayload,
  ) {
    await this.notificationsService.sendAccountReactivationEmail(
      payload.email,
      payload.verificationToken,
      payload.name,
    );
  }

  private async handleAccountReactivated(payload: AccountReactivatedPayload) {
    if (!(await this.isUserEligibleForNotification(payload.userId))) {
      this.logger.warn(
        `Skipping AccountReactivated notification for ineligible user: ${payload.userId}`,
      );
      return;
    }
    await this.notificationsService.sendAccountReactivatedEmail(
      payload.email,
      payload.name,
    );

    await this.notificationsService.createInAppNotification({
      userId: payload.userId,
      type: InAppNotificationType.WELCOME,
      title: InAppNotificationTitles.WELCOME_BACK,
      body: 'Your account has been successfully reactivated.',
    });
  }

  private async handleChatMessageSent(payload: ChatMessageSentPayload) {
    if (!(await this.isUserEligibleForNotification(payload.recipientId))) {
      this.logger.warn(
        `Skipping ChatMessageSent notification for ineligible user: ${payload.recipientId}`,
      );
      return;
    }
    await this.notificationsService.createInAppNotification({
      userId: payload.recipientId,
      type: InAppNotificationType.NEW_CHAT_MESSAGE,
      title: InAppNotificationTitles.NEW_CHAT_MESSAGE,
      body: payload.preview,
      referenceId: payload.auctionId,
      referenceType: NotificationReferenceType.AUCTION,
    });
  }

  private async isUserEligibleForNotification(
    userId: string,
  ): Promise<boolean> {
    const user = await this.usersService.findByIdIncludingDeleted(userId);
    if (!user) return false;
    if (user.isBanned) return false;
    return true;
  }
}
