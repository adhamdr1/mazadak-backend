import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { Types } from 'mongoose';
import { ChatMessageType } from './enums/chat-message-type.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { AuctionStatus } from '../auctions/enums/auction-status.enum';
import { ChatForbiddenException } from './exceptions/chat-forbidden.exception';
import { ChatNotAllowedException } from './exceptions/chat-not-allowed.exception';
import { ChatEditTimeoutException } from './exceptions/chat-edit-timeout.exception';
import { ChatMessageNotFoundException } from './exceptions/chat-message-not-found.exception';
import { AuctionNotFoundException } from '../auctions/exceptions/auction-not-found.exception';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { CreateChatMessageInput } from './dto/create-chat-message.input';

const mockChatRepository = {
  createMessage: jest.fn(),
  findByClientMessageId: jest.fn(),
  findById: jest.fn(),
  updateMessageAtomically: jest.fn(),
  addOrUpdateReaction: jest.fn(),
  removeReaction: jest.fn(),
  findByAuctionIdWithCursor: jest.fn(),
  upsertReadState: jest.fn(),
  findReadState: jest.fn(),
};

const mockAuctionRepository = {
  findById: jest.fn(),
};

const mockRabbitMQService = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockRealtimeService = {
  publishMessageSent: jest.fn(),
  publishMessageUpdated: jest.fn(),
  publishChatReadStatusUpdated: jest.fn(),
};

describe('ChatService', () => {
  let service: ChatService;

  const auctionId = new Types.ObjectId().toString();
  const sellerId = new Types.ObjectId().toString();
  const buyerId = new Types.ObjectId().toString();
  const strangerId = new Types.ObjectId().toString();
  const messageId = new Types.ObjectId().toString();

  const mockAuction: Auction = {
    _id: new Types.ObjectId(auctionId),
    sellerId: new Types.ObjectId(sellerId),
    winnerId: new Types.ObjectId(buyerId),
    status: AuctionStatus.ENDED,
    title: 'Ended Auction',
    description: 'Desc',
    startPrice: Types.Decimal128.fromString('100.00'),
    currentBid: Types.Decimal128.fromString('200.00'),
    minBidIncrement: Types.Decimal128.fromString('10.00'),
    durationDays: 7,
    itemCondition: 'NEW',
    category: 'Electronics',
    images: [],
    bidCount: 5,
    isExtended: false,
    autoExtendMinutes: 5,
    viewCount: 10,
    startTime: new Date(),
    endTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Auction;

  const mockChatMessage: ChatMessage = {
    _id: new Types.ObjectId(messageId),
    clientMessageId: 'client-msg-1',
    auctionId: new Types.ObjectId(auctionId),
    senderId: new Types.ObjectId(buyerId),
    senderName: 'Buyer',
    type: ChatMessageType.TEXT,
    content: 'Hello seller!',
    reactions: [],
    isEdited: false,
    isDeleted: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: 'IChatRepository',
          useValue: mockChatRepository,
        },
        {
          provide: 'IAuctionRepository',
          useValue: mockAuctionRepository,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: RealtimeService,
          useValue: mockRealtimeService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyChatAccess', () => {
    it('should throw AuctionNotFoundException if auction does not exist', async () => {
      mockAuctionRepository.findById.mockResolvedValue(null);

      await expect(
        service.verifyChatAccess(buyerId, UserRole.USER, auctionId),
      ).rejects.toThrow(AuctionNotFoundException);
    });

    it('should throw ChatNotAllowedException if auction is not ENDED or has no winner', async () => {
      mockAuctionRepository.findById.mockResolvedValue({
        ...mockAuction,
        status: AuctionStatus.ACTIVE,
      });

      await expect(
        service.verifyChatAccess(buyerId, UserRole.USER, auctionId),
      ).rejects.toThrow(ChatNotAllowedException);
    });

    it('should throw ChatForbiddenException if user is neither seller, winner, nor admin', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);

      await expect(
        service.verifyChatAccess(strangerId, UserRole.USER, auctionId),
      ).rejects.toThrow(ChatForbiddenException);
    });

    it('should succeed for buyer, seller, and admin', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);

      await expect(
        service.verifyChatAccess(buyerId, UserRole.USER, auctionId),
      ).resolves.not.toThrow();

      await expect(
        service.verifyChatAccess(sellerId, UserRole.USER, auctionId),
      ).resolves.not.toThrow();

      await expect(
        service.verifyChatAccess(strangerId, UserRole.ADMIN, auctionId),
      ).resolves.not.toThrow();
    });
  });

  describe('sendMessage', () => {
    const input: CreateChatMessageInput = {
      auctionId,
      clientMessageId: 'client-msg-1',
      content: 'Hello seller!',
      type: ChatMessageType.TEXT,
    };

    it('should create and broadcast message successfully', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.createMessage.mockResolvedValue(mockChatMessage);

      const result = await service.sendMessage(
        buyerId,
        'Buyer',
        UserRole.USER,
        input,
      );

      expect(result).toEqual(mockChatMessage);
      expect(mockChatRepository.createMessage).toHaveBeenCalledWith({
        clientMessageId: input.clientMessageId,
        auctionId: input.auctionId,
        senderId: buyerId,
        senderName: 'Buyer',
        content: input.content,
        type: input.type,
        mediaUrls: undefined,
      });
      expect(mockRealtimeService.publishMessageSent).toHaveBeenCalledWith(
        mockChatMessage,
      );
    });

    it('should return existing message on duplicate clientMessageId (code 11000)', async () => {
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.createMessage.mockRejectedValue({ code: 11000 });
      mockChatRepository.findByClientMessageId.mockResolvedValue(
        mockChatMessage,
      );

      const result = await service.sendMessage(
        buyerId,
        'Buyer',
        UserRole.USER,
        input,
      );

      expect(result).toEqual(mockChatMessage);
      expect(mockChatRepository.findByClientMessageId).toHaveBeenCalledWith(
        input.auctionId,
        buyerId,
        input.clientMessageId,
      );
    });
  });

  describe('editMessage', () => {
    it('should throw ChatMessageNotFoundException if message not found', async () => {
      mockChatRepository.findById.mockResolvedValue(null);

      await expect(
        service.editMessage(buyerId, UserRole.USER, messageId, 'New content'),
      ).rejects.toThrow(ChatMessageNotFoundException);
    });

    it('should throw ChatForbiddenException if user is not the message sender', async () => {
      mockChatRepository.findById.mockResolvedValue(mockChatMessage); // senderId: buyerId

      await expect(
        service.editMessage(sellerId, UserRole.USER, messageId, 'New content'),
      ).rejects.toThrow(ChatForbiddenException);
    });

    it('should throw ChatEditTimeoutException if 15min window passed', async () => {
      mockChatRepository.findById.mockResolvedValue(mockChatMessage);
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.updateMessageAtomically.mockResolvedValue(null);

      await expect(
        service.editMessage(buyerId, UserRole.USER, messageId, 'New content'),
      ).rejects.toThrow(ChatEditTimeoutException);
    });

    it('should edit message and publish update', async () => {
      const updatedMessage = {
        ...mockChatMessage,
        content: 'Updated content',
        isEdited: true,
      };
      mockChatRepository.findById.mockResolvedValue(mockChatMessage);
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.updateMessageAtomically.mockResolvedValue(
        updatedMessage,
      );

      const result = await service.editMessage(
        buyerId,
        UserRole.USER,
        messageId,
        'Updated content',
      );

      expect(result).toEqual(updatedMessage);
      expect(mockRealtimeService.publishMessageUpdated).toHaveBeenCalledWith(
        updatedMessage,
      );
    });
  });

  describe('deleteMessage', () => {
    it('should throw ChatMessageNotFoundException if message not found', async () => {
      mockChatRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteMessage(buyerId, UserRole.USER, messageId),
      ).rejects.toThrow(ChatMessageNotFoundException);
    });

    it('should throw ChatForbiddenException if user is neither owner nor admin', async () => {
      mockChatRepository.findById.mockResolvedValue(mockChatMessage); // senderId: buyerId

      await expect(
        service.deleteMessage(sellerId, UserRole.USER, messageId),
      ).rejects.toThrow(ChatForbiddenException);
    });

    it('should delete message as owner and publish update', async () => {
      const deletedMessage = { ...mockChatMessage, isDeleted: true };
      mockChatRepository.findById.mockResolvedValue(mockChatMessage);
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.updateMessageAtomically.mockResolvedValue(
        deletedMessage,
      );

      const result = await service.deleteMessage(
        buyerId,
        UserRole.USER,
        messageId,
      );

      expect(result).toEqual(deletedMessage);
      expect(mockRealtimeService.publishMessageUpdated).toHaveBeenCalledWith(
        deletedMessage,
      );
    });

    it('should delete message as admin without time limit', async () => {
      const deletedMessage = { ...mockChatMessage, isDeleted: true };
      mockChatRepository.findById.mockResolvedValue(mockChatMessage);
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.updateMessageAtomically.mockResolvedValue(
        deletedMessage,
      );

      const result = await service.deleteMessage(
        strangerId,
        UserRole.ADMIN,
        messageId,
      );

      expect(result).toEqual(deletedMessage);
      expect(mockChatRepository.updateMessageAtomically).toHaveBeenCalledWith(
        messageId,
        mockChatMessage.senderId.toString(),
        { isDeleted: true },
        undefined,
      );
    });
  });

  describe('reactToMessage', () => {
    it('should add reaction if emoji provided', async () => {
      const reactedMessage = {
        ...mockChatMessage,
        reactions: [{ emoji: '👍', userId: new Types.ObjectId(sellerId) }],
      };
      mockChatRepository.findById.mockResolvedValue(mockChatMessage);
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.addOrUpdateReaction.mockResolvedValue(reactedMessage);

      const result = await service.reactToMessage(
        sellerId,
        UserRole.USER,
        messageId,
        '👍',
      );

      expect(result).toEqual(reactedMessage);
      expect(mockChatRepository.addOrUpdateReaction).toHaveBeenCalledWith(
        messageId,
        sellerId,
        '👍',
      );
    });

    it('should remove reaction if emoji not provided', async () => {
      mockChatRepository.findById.mockResolvedValue(mockChatMessage);
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.removeReaction.mockResolvedValue(mockChatMessage);

      const result = await service.reactToMessage(
        sellerId,
        UserRole.USER,
        messageId,
      );

      expect(result).toEqual(mockChatMessage);
      expect(mockChatRepository.removeReaction).toHaveBeenCalledWith(
        messageId,
        sellerId,
      );
    });
  });

  describe('getChatMessages, markChatAsRead, findReadState', () => {
    it('should get chat messages with pagination', async () => {
      const pageResult = {
        items: [mockChatMessage],
        hasNextPage: false,
        endCursor: 'cursor_1',
      };
      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.findByAuctionIdWithCursor.mockResolvedValue(
        pageResult,
      );

      const result = await service.getChatMessages(
        buyerId,
        UserRole.USER,
        auctionId,
        20,
      );

      expect(result).toEqual(pageResult);
      expect(mockChatRepository.findByAuctionIdWithCursor).toHaveBeenCalledWith(
        auctionId,
        20,
        undefined,
      );
    });

    it('should mark chat as read and broadcast status', async () => {
      const readState: ChatReadState = {
        _id: new Types.ObjectId(),
        auctionId: new Types.ObjectId(auctionId),
        userId: new Types.ObjectId(buyerId),
        lastReadMessageId: new Types.ObjectId(messageId),
        lastReadAt: new Date(),
      };

      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.upsertReadState.mockResolvedValue(readState);

      const result = await service.markChatAsRead(
        buyerId,
        UserRole.USER,
        auctionId,
        messageId,
      );

      expect(result).toBe(true);
      expect(
        mockRealtimeService.publishChatReadStatusUpdated,
      ).toHaveBeenCalledWith({
        auctionId,
        userId: buyerId,
        lastReadMessageId: messageId,
        lastReadAt: readState.lastReadAt,
      });
    });

    it('should find read state', async () => {
      const readState: ChatReadState = {
        _id: new Types.ObjectId(),
        auctionId: new Types.ObjectId(auctionId),
        userId: new Types.ObjectId(buyerId),
        lastReadMessageId: new Types.ObjectId(messageId),
        lastReadAt: new Date(),
      };

      mockAuctionRepository.findById.mockResolvedValue(mockAuction);
      mockChatRepository.findReadState.mockResolvedValue(readState);

      const result = await service.findReadState(
        buyerId,
        UserRole.USER,
        auctionId,
      );

      expect(result).toEqual(readState);
    });
  });
});
