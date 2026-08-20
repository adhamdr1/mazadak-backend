import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsConsumer } from './notifications.consumer';
import { NotificationsService } from './notifications.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import {
  NOTIFICATIONS_RETRY_QUEUE_5S,
  NOTIFICATIONS_RETRY_QUEUE_30S,
  NOTIFICATIONS_RETRY_QUEUE_2M,
  X_RETRY_COUNT,
} from '../infrastructure/rabbitmq/rabbitmq.constants';
import * as amqpManager from 'amqp-connection-manager';
import type * as amqplib from 'amqplib';

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(),
}));

const mockNotificationsService = {
  createInAppNotification: jest.fn().mockResolvedValue(undefined),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendAuctionWonEmail: jest.fn().mockResolvedValue(undefined),
  sendAuctionEndedSellerEmail: jest.fn().mockResolvedValue(undefined),
  sendOutbidEmail: jest.fn().mockResolvedValue(undefined),
  sendDepositSuccessfulEmail: jest.fn().mockResolvedValue(undefined),
  sendWithdrawalCompletedEmail: jest.fn().mockResolvedValue(undefined),
  sendDisputeOpenedEmail: jest.fn().mockResolvedValue(undefined),
  sendDisputeResolvedEmail: jest.fn().mockResolvedValue(undefined),
};

const mockUsersService = {
  findByIdIncludingDeleted: jest.fn().mockResolvedValue({
    email: 'u@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isBanned: false,
  }),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('amqp://localhost:5672'),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
};

type HandleMessageFn = (
  msg: amqplib.ConsumeMessage,
  channel: amqplib.Channel,
) => Promise<void>;

describe('NotificationsConsumer', () => {
  let consumer: NotificationsConsumer;
  let handleMessage: HandleMessageFn;
  let mockChannel: {
    prefetch: jest.Mock;
    consume: jest.Mock;
    ack: jest.Mock;
    nack: jest.Mock;
    reject: jest.Mock;
    sendToQueue: jest.Mock;
  };
  let mockChannelWrapper: {
    close: jest.Mock;
  };
  let mockConnection: {
    on: jest.Mock;
    createChannel: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(async () => {
    mockChannel = {
      prefetch: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(undefined),
      ack: jest.fn(),
      nack: jest.fn(),
      reject: jest.fn(),
      sendToQueue: jest.fn(),
    };

    mockChannelWrapper = {
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      on: jest.fn(),
      createChannel: jest.fn().mockReturnValue(mockChannelWrapper),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (amqpManager.connect as jest.Mock).mockReturnValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsConsumer,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRedisConnectionToken('default'),
          useValue: mockRedis,
        },
      ],
    }).compile();

    consumer = module.get<NotificationsConsumer>(NotificationsConsumer);
    consumer.onApplicationBootstrap();

    const consumerWithHandleMessage = consumer as unknown as {
      handleMessage: HandleMessageFn;
    };
    handleMessage = (msg: amqplib.ConsumeMessage, ch: amqplib.Channel) =>
      consumerWithHandleMessage.handleMessage(msg, ch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('lifecycle', () => {
    it('should connect and create channel on application bootstrap', () => {
      expect(amqpManager.connect).toHaveBeenCalledWith([
        'amqp://localhost:5672',
      ]);
      expect(mockConnection.createChannel).toHaveBeenCalled();
    });

    it('should close connection and channel on module destroy', async () => {
      await consumer.onModuleDestroy();

      expect(mockChannelWrapper.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should reject invalid JSON to DLQ immediately', async () => {
      const msg = {
        content: Buffer.from('invalid-json'),
      } as unknown as amqplib.ConsumeMessage;

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.reject).toHaveBeenCalledWith(msg, false);
    });

    it('should ignore duplicate message if key exists in Redis', async () => {
      const messagePayload = {
        messageId: 'msg-123',
        eventType: RabbitMQEvent.UserRegistered,
        payload: { email: 'u@example.com', name: 'John' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue('1');

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
      expect(mockNotificationsService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it('should process UserRegistered event, set idempotency and ack message', async () => {
      const messagePayload = {
        messageId: 'msg-123',
        eventType: RabbitMQEvent.UserRegistered,
        payload: {
          email: 'u@example.com',
          name: 'John',
          userId: 'u1',
          verificationToken: 'tok-123',
          phone: '+20100',
        },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(
        mockNotificationsService.sendEmailVerification,
      ).toHaveBeenCalledWith('u@example.com', 'tok-123', 'John', '+20100');
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should process PasswordReset event', async () => {
      const messagePayload = {
        messageId: 'msg-456',
        eventType: RabbitMQEvent.PasswordReset,
        payload: {
          email: 'u@example.com',
          name: 'John Doe',
          resetToken: 'reset-tok',
          metadata: { ip: '127.0.0.1', browser: 'Chrome', time: '2026-08-20' },
        },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(
        mockNotificationsService.sendPasswordResetEmail,
      ).toHaveBeenCalledWith(
        'u@example.com',
        'reset-tok',
        { firstName: 'John', lastName: 'Doe' },
        messagePayload.payload.metadata,
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should process WalletDeposited event', async () => {
      const messagePayload = {
        messageId: 'msg-789',
        eventType: RabbitMQEvent.WalletDeposited,
        payload: {
          userId: 'u1',
          amount: 500,
          currency: 'EGP',
          transactionId: 'tx-1',
          transactionType: 'DEPOSIT',
          newBalance: 1500,
        },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(
        mockNotificationsService.createInAppNotification,
      ).toHaveBeenCalled();
      expect(
        mockNotificationsService.sendDepositSuccessfulEmail,
      ).toHaveBeenCalledWith('u@example.com', 'John Doe', 500, 'tx-1');
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should re-queue to 5s retry queue on first failure', async () => {
      const messagePayload = {
        messageId: 'msg-err-1',
        eventType: RabbitMQEvent.UserRegistered,
        payload: {
          email: 'u@example.com',
          name: 'John',
          userId: 'u1',
          verificationToken: 'tok-123',
          phone: '+20100',
        },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);
      mockNotificationsService.sendEmailVerification.mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        NOTIFICATIONS_RETRY_QUEUE_5S,
        msg.content,
        expect.objectContaining({
          headers: {
            [X_RETRY_COUNT]: 1,
          },
        }),
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should re-queue to 30s retry queue on second failure', async () => {
      const messagePayload = {
        messageId: 'msg-err-2',
        eventType: RabbitMQEvent.UserRegistered,
        payload: {
          email: 'u@example.com',
          name: 'John',
          userId: 'u1',
          verificationToken: 'tok-123',
          phone: '+20100',
        },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: { [X_RETRY_COUNT]: 1 } },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);
      mockNotificationsService.sendEmailVerification.mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        NOTIFICATIONS_RETRY_QUEUE_30S,
        msg.content,
        expect.objectContaining({
          headers: {
            [X_RETRY_COUNT]: 2,
          },
        }),
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should re-queue to 2m retry queue on third failure', async () => {
      const messagePayload = {
        messageId: 'msg-err-3',
        eventType: RabbitMQEvent.UserRegistered,
        payload: {
          email: 'u@example.com',
          name: 'John',
          userId: 'u1',
          verificationToken: 'tok-123',
          phone: '+20100',
        },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: { [X_RETRY_COUNT]: 2 } },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);
      mockNotificationsService.sendEmailVerification.mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        NOTIFICATIONS_RETRY_QUEUE_2M,
        msg.content,
        expect.objectContaining({
          headers: {
            [X_RETRY_COUNT]: 3,
          },
        }),
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should nack to DLQ after exceeding max retries', async () => {
      const messagePayload = {
        messageId: 'msg-err-4',
        eventType: RabbitMQEvent.UserRegistered,
        payload: {
          email: 'u@example.com',
          name: 'John',
          userId: 'u1',
          verificationToken: 'tok-123',
          phone: '+20100',
        },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: { [X_RETRY_COUNT]: 3 } },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);
      mockNotificationsService.sendEmailVerification.mockRejectedValueOnce(
        new Error('Permanent failure'),
      );

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
      expect(mockChannel.sendToQueue).not.toHaveBeenCalled();
    });
  });
});
