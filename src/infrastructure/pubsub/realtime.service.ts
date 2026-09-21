import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from './pubsub.provider';
import { PUB_SUB_EVENTS } from './events.constants';
import { BidAddedPayload } from '../../bids/dto/bid-added.payload';
import { InAppNotification } from '../../notifications/in-app/entities/in-app-notification.entity';
import { AuctionStatusChangedPayload } from '../../auctions/dto/auction-status-changed.payload';
import { Auction } from '../../auctions/entities/auction.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { EscrowStatusChangedInternalPayload } from '../../escrow/dto/escrow-status-changed.payload';
import { DisputeStatusChangedInternalPayload } from '../../escrow/dto/dispute-status-changed.payload';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
  ) {}

  /**
   * Helper to publish events safely by catching errors.
   * Prevents Redis pubsub network failures from failing the main operation.
   */
  private async publishSafely<T>(event: string, payload: T): Promise<void> {
    try {
      await this.pubSub.publish(event, payload);
    } catch (error) {
      this.logger.error(
        `Failed to publish event "${event}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Publish a real-time event when a new auction is created.
   */
  async publishAuctionCreated(payload: Auction): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.AUCTION_CREATED, {
      auctionCreated: payload,
    });
  }

  /**
   * Publish a real-time event when a new bid is successfully placed.
   */
  async publishBidAdded(payload: BidAddedPayload): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.BID_ADDED, {
      bidAdded: payload,
    });
  }

  /**
   * Publish a real-time event when a new notification is created for a user.
   */
  async publishNotificationAdded(payload: InAppNotification): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.NOTIFICATION_ADDED, {
      notificationAdded: payload,
    });
  }

  /**
   * Publish a real-time event when an auction status changes.
   */
  async publishAuctionStatusChanged(
    payload: AuctionStatusChangedPayload,
  ): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.AUCTION_STATUS_CHANGED, {
      auctionStatusChanged: payload,
    });
  }

  /**
   * Publish a real-time event when a message is sent in chat.
   */
  async publishMessageSent(payload: ChatMessage): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.MESSAGE_SENT, {
      messageSent: payload,
    });
  }

  /**
   * Publish a real-time event when a message is updated or deleted in chat.
   */
  async publishMessageUpdated(payload: ChatMessage): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.MESSAGE_UPDATED, {
      messageUpdated: payload,
    });
  }

  /**
   * Publish a real-time event when chat read status is updated.
   */
  async publishChatReadStatusUpdated(payload: {
    auctionId: string;
    userId: string;
    lastReadMessageId: string | null;
    lastReadAt: Date | null;
  }): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.CHAT_READ_STATUS_UPDATED, {
      chatReadStatusUpdated: payload,
    });
  }

  /**
   * Publish a real-time event when a user's wallet balances or status change.
   */
  async publishWalletUpdated(payload: Wallet): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.WALLET_UPDATED, {
      walletUpdated: payload,
    });
  }

  /**
   * Publish a real-time event when a new withdrawal request is submitted (for Admin live feed).
   */
  async publishWithdrawalRequested(payload: unknown): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.WITHDRAWAL_REQUESTED, {
      adminWithdrawalFeed: payload,
    });
  }

  /**
   * Publish a real-time event when a withdrawal request status changes (for both User and Admin).
   */
  async publishWithdrawalStatusChanged(payload: unknown): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.WITHDRAWAL_STATUS_CHANGED, {
      myWithdrawalUpdated: payload,
      adminWithdrawalFeed: payload,
    });
  }

  /**
   * Publish a real-time event when an escrow status changes (for Buyer, Seller, and Admin).
   */
  async publishEscrowStatusChanged(
    payload: EscrowStatusChangedInternalPayload,
  ): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.ESCROW_STATUS_CHANGED, {
      escrowStatusChanged: payload,
    });
  }

  /**
   * Publish a real-time event when a dispute status changes (for Claimant, Defendant, and Admin).
   */
  async publishDisputeStatusChanged(
    payload: DisputeStatusChangedInternalPayload,
  ): Promise<void> {
    await this.publishSafely(PUB_SUB_EVENTS.DISPUTE_STATUS_CHANGED, {
      disputeStatusChanged: payload,
    });
  }
}
