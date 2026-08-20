import { Test, TestingModule } from '@nestjs/testing';
import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';
import { PUB_SUB } from '../infrastructure/pubsub/pubsub.provider';
import { Types } from 'mongoose';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageType } from './enums/chat-message-type.enum';
import { ChatReadState } from './entities/chat-read-state.entity';
import { CreateChatMessageInput } from './dto/create-chat-message.input';
import { UnauthorizedException } from '@nestjs/common';

const mockChatService = {
  getChatMessages: jest.fn(),
  findReadState: jest.fn(),
  sendMessage: jest.fn(),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  reactToMessage: jest.fn(),
  markChatAsRead: jest.fn(),
  verifyChatAccess: jest.fn(),
};

const mockPubSub = {
  asyncIterableIterator: jest.fn(),
};

describe('ChatResolver', () => {
  let resolver: ChatResolver;

  const currentUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
  };

  const adminUser: JwtPayload = {
    sub: new Types.ObjectId().toString(),
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const auctionId = new Types.ObjectId().toString();
  const messageId = new Types.ObjectId().toString();

  const mockChatMessage: ChatMessage = {
    _id: new Types.ObjectId(messageId),
    clientMessageId: 'client-msg-1',
    auctionId: new Types.ObjectId(auctionId),
    senderId: new Types.ObjectId(currentUser.sub),
    senderName: 'John Doe',
    type: ChatMessageType.TEXT,
    content: 'Hello world',
    reactions: [],
    isEdited: false,
    isDeleted: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatResolver,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: PUB_SUB,
          useValue: mockPubSub,
        },
      ],
    }).compile();

    resolver = module.get<ChatResolver>(ChatResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('Queries', () => {
    it('should call getChatMessages', async () => {
      const pageResult = {
        items: [mockChatMessage],
        hasNextPage: false,
        endCursor: 'c1',
      };
      mockChatService.getChatMessages.mockResolvedValue(pageResult);

      const result = await resolver.getChatMessages(
        currentUser,
        auctionId,
        20,
        'c0',
      );

      expect(result).toEqual(pageResult);
      expect(mockChatService.getChatMessages).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.role,
        auctionId,
        20,
        'c0',
      );
    });

    it('should call getChatReadState', async () => {
      const readState: ChatReadState = {
        _id: new Types.ObjectId(),
        auctionId: new Types.ObjectId(auctionId),
        userId: new Types.ObjectId(currentUser.sub),
        lastReadMessageId: new Types.ObjectId(messageId),
        lastReadAt: new Date(),
      };
      mockChatService.findReadState.mockResolvedValue(readState);

      const result = await resolver.getChatReadState(currentUser, auctionId);

      expect(result).toEqual(readState);
      expect(mockChatService.findReadState).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.role,
        auctionId,
      );
    });
  });

  describe('Mutations', () => {
    it('should call sendMessage with full name', async () => {
      const input: CreateChatMessageInput = {
        auctionId,
        clientMessageId: 'c1',
        content: 'Hello',
        type: ChatMessageType.TEXT,
      };
      mockChatService.sendMessage.mockResolvedValue(mockChatMessage);

      const result = await resolver.sendMessage(currentUser, input);

      expect(result).toEqual(mockChatMessage);
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        currentUser.sub,
        'John Doe',
        currentUser.role,
        input,
      );
    });

    it('should call editMessage', async () => {
      const edited = {
        ...mockChatMessage,
        content: 'New text',
        isEdited: true,
      };
      mockChatService.editMessage.mockResolvedValue(edited);

      const result = await resolver.editMessage(
        currentUser,
        messageId,
        'New text',
      );

      expect(result).toEqual(edited);
      expect(mockChatService.editMessage).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.role,
        messageId,
        'New text',
      );
    });

    it('should call deleteMessage', async () => {
      const deleted = { ...mockChatMessage, isDeleted: true };
      mockChatService.deleteMessage.mockResolvedValue(deleted);

      const result = await resolver.deleteMessage(currentUser, messageId);

      expect(result).toEqual(deleted);
      expect(mockChatService.deleteMessage).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.role,
        messageId,
      );
    });

    it('should call reactToMessage', async () => {
      mockChatService.reactToMessage.mockResolvedValue(mockChatMessage);

      const result = await resolver.reactToMessage(
        currentUser,
        messageId,
        '👍',
      );

      expect(result).toEqual(mockChatMessage);
      expect(mockChatService.reactToMessage).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.role,
        messageId,
        '👍',
      );
    });

    it('should call markChatAsRead', async () => {
      mockChatService.markChatAsRead.mockResolvedValue(true);

      const result = await resolver.markChatAsRead(
        currentUser,
        auctionId,
        messageId,
      );

      expect(result).toBe(true);
      expect(mockChatService.markChatAsRead).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.role,
        auctionId,
        messageId,
      );
    });
  });

  describe('Field Resolver: resolveContent', () => {
    it('should return null for deleted message if user is not admin', () => {
      const deletedMessage: ChatMessage = {
        ...mockChatMessage,
        isDeleted: true,
        content: 'Secret',
      };

      const result = resolver.resolveContent(deletedMessage, currentUser);

      expect(result).toBeNull();
    });

    it('should return content for deleted message if user is admin', () => {
      const deletedMessage: ChatMessage = {
        ...mockChatMessage,
        isDeleted: true,
        content: 'Secret',
      };

      const result = resolver.resolveContent(deletedMessage, adminUser);

      expect(result).toBe('Secret');
    });

    it('should return content for normal message', () => {
      const result = resolver.resolveContent(mockChatMessage, currentUser);

      expect(result).toBe('Hello world');
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to messageSent after verifying chat access', async () => {
      mockChatService.verifyChatAccess.mockResolvedValue(undefined);
      const mockIterator = {} as AsyncIterable<{ messageSent: ChatMessage }>;
      mockPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = await resolver.messageSent(currentUser, auctionId);

      expect(result).toBe(mockIterator);
      expect(mockChatService.verifyChatAccess).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.role,
        auctionId,
      );
    });

    it('should throw UnauthorizedException if user is missing in messageSent', async () => {
      await expect(
        resolver.messageSent(undefined as unknown as JwtPayload, auctionId),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should subscribe to messageUpdated after verifying chat access', async () => {
      mockChatService.verifyChatAccess.mockResolvedValue(undefined);
      const mockIterator = {} as AsyncIterable<{ messageUpdated: ChatMessage }>;
      mockPubSub.asyncIterableIterator.mockReturnValue(mockIterator);

      const result = await resolver.messageUpdated(currentUser, auctionId);

      expect(result).toBe(mockIterator);
      expect(mockChatService.verifyChatAccess).toHaveBeenCalledWith(
        currentUser.sub,
        currentUser.role,
        auctionId,
      );
    });
  });
});
