import { RedisPubSub } from 'graphql-redis-subscriptions';
import { BidAddedPayload } from '../../bids/dto/bid-added.payload';
import { InAppNotification } from '../../notifications/in-app/entities/in-app-notification.entity';
import { NotificationReadPayload } from '../../notifications/in-app/dto/notification-read.payload';
import { AuctionStatusChangedPayload } from '../../auctions/dto/auction-status-changed.payload';
import { Auction } from '../../auctions/entities/auction.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { EscrowStatusChangedInternalPayload } from '../../escrow/dto/escrow-status-changed.payload';
import { DisputeStatusChangedInternalPayload } from '../../escrow/dto/dispute-status-changed.payload';
import type { ChatRoomUpdatedInternalPayload } from '../../chat/interfaces/chat-room-updated-internal.payload';
import { ReviewAddedPayload } from '../../reviews/dto/review-added.payload';
export declare class RealtimeService {
    private readonly pubSub;
    private readonly logger;
    constructor(pubSub: RedisPubSub);
    private publishSafely;
    publishAuctionCreated(payload: Auction): Promise<void>;
    publishBidAdded(payload: BidAddedPayload): Promise<void>;
    publishNotificationAdded(payload: InAppNotification): Promise<void>;
    publishNotificationReadStatusUpdated(userId: string, payload: NotificationReadPayload): Promise<void>;
    publishAuctionStatusChanged(payload: AuctionStatusChangedPayload): Promise<void>;
    publishMessageSent(payload: ChatMessage): Promise<void>;
    publishMessageUpdated(payload: ChatMessage): Promise<void>;
    publishChatReadStatusUpdated(payload: {
        auctionId: string;
        userId: string;
        lastReadMessageId: string | null;
        lastReadAt: Date | null;
    }): Promise<void>;
    publishChatRoomUpdated(payload: ChatRoomUpdatedInternalPayload): Promise<void>;
    publishWalletUpdated(payload: Wallet): Promise<void>;
    publishWithdrawalRequested(payload: unknown): Promise<void>;
    publishWithdrawalStatusChanged(payload: unknown): Promise<void>;
    publishEscrowStatusChanged(payload: EscrowStatusChangedInternalPayload): Promise<void>;
    publishDisputeStatusChanged(payload: DisputeStatusChangedInternalPayload): Promise<void>;
    publishReviewAddedToUser(payload: ReviewAddedPayload): Promise<void>;
}
