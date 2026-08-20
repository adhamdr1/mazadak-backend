import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeService } from './realtime.service';
import { PUB_SUB } from './pubsub.provider';
import { PUB_SUB_EVENTS } from './events.constants';
import { BidAddedPayload } from '../../bids/dto/bid-added.payload';
import { InAppNotification } from '../../notifications/in-app/entities/in-app-notification.entity';
import { AuctionStatusChangedPayload } from '../../auctions/dto/auction-status-changed.payload';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { InAppNotificationType } from '../../notifications/in-app/enums/in-app-notification-type.enum';
import { ChatMessageType } from '../../chat/enums/chat-message-type.enum';
import { Types } from 'mongoose';
import { Bid } from '../../bids/entities/bid.entity';
import { Auction } from '../../auctions/entities/auction.entity';

const mockPubSub = {
  publish: jest.fn().mockResolvedValue(undefined),
};

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
        {
          provide: PUB_SUB,
          useValue: mockPubSub,
        },
      ],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should publish bid added event', async () => {
    const payload: BidAddedPayload = {
      bid: {
        _id: new Types.ObjectId(),
        amount: 1500,
        auctionId: new Types.ObjectId(),
        bidderId: new Types.ObjectId(),
      } as unknown as Bid,
      currentPrice: 1500,
      leadingBidderId: 'u1',
      bidCount: 5,
    };

    await service.publishBidAdded(payload);

    expect(mockPubSub.publish).toHaveBeenCalledWith(PUB_SUB_EVENTS.BID_ADDED, {
      bidAdded: payload,
    });
  });

  it('should publish notification added event', async () => {
    const payload: InAppNotification = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      type: InAppNotificationType.AUCTION_WON,
      title: 'You won!',
      body: 'Congratulations',
      isRead: false,
      referenceId: null,
      referenceType: null,
      createdAt: new Date(),
    };

    await service.publishNotificationAdded(payload);

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      PUB_SUB_EVENTS.NOTIFICATION_ADDED,
      { notificationAdded: payload },
    );
  });

  it('should publish auction status changed event', async () => {
    const payload: AuctionStatusChangedPayload = {
      auction: {
        _id: new Types.ObjectId(),
        title: 'Vintage Watch',
      } as unknown as Auction,
    };

    await service.publishAuctionStatusChanged(payload);

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      PUB_SUB_EVENTS.AUCTION_STATUS_CHANGED,
      { auctionStatusChanged: payload },
    );
  });

  it('should publish message sent event', async () => {
    const payload: ChatMessage = {
      _id: new Types.ObjectId(),
      auctionId: new Types.ObjectId(),
      senderId: new Types.ObjectId(),
      senderName: 'John',
      content: 'Hello',
      type: ChatMessageType.TEXT,
      mediaUrls: [],
      isEdited: false,
      isDeleted: false,
      clientMessageId: 'client-1',
      reactions: [],
      createdAt: new Date(),
    };

    await service.publishMessageSent(payload);

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      PUB_SUB_EVENTS.MESSAGE_SENT,
      {
        messageSent: payload,
      },
    );
  });

  it('should publish message updated event', async () => {
    const payload: ChatMessage = {
      _id: new Types.ObjectId(),
      auctionId: new Types.ObjectId(),
      senderId: new Types.ObjectId(),
      senderName: 'John',
      content: 'Updated content',
      type: ChatMessageType.TEXT,
      mediaUrls: [],
      isEdited: true,
      isDeleted: false,
      clientMessageId: 'client-1',
      reactions: [],
      createdAt: new Date(),
    };

    await service.publishMessageUpdated(payload);

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      PUB_SUB_EVENTS.MESSAGE_UPDATED,
      { messageUpdated: payload },
    );
  });

  it('should publish chat read status updated event', async () => {
    const payload = {
      auctionId: 'auc-1',
      userId: 'u1',
      lastReadMessageId: 'msg-5',
      lastReadAt: new Date(),
    };

    await service.publishChatReadStatusUpdated(payload);

    expect(mockPubSub.publish).toHaveBeenCalledWith(
      PUB_SUB_EVENTS.CHAT_READ_STATUS_UPDATED,
      { chatReadStatusUpdated: payload },
    );
  });

  it('should handle pubsub errors gracefully without throwing', async () => {
    mockPubSub.publish.mockRejectedValue(new Error('Redis connection down'));

    const payload = {
      auctionId: 'auc-1',
      userId: 'u1',
      lastReadMessageId: 'msg-5',
      lastReadAt: new Date(),
    };

    await expect(
      service.publishChatReadStatusUpdated(payload),
    ).resolves.not.toThrow();
  });
});
