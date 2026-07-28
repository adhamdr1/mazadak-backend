import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from './pubsub.provider';
import { PUB_SUB_EVENTS } from './events.constants';
import { BidAddedPayload } from '../../bids/dto/bid-added.payload';
import { InAppNotification } from '../../notifications/in-app/entities/in-app-notification.entity';
import { AuctionStatusChangedPayload } from '../../auctions/dto/auction-status-changed.payload';

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
}
