import { Test, TestingModule } from '@nestjs/testing';
import { AuctionConsumer } from './auction.consumer';
import { AuctionsService } from '../auctions.service';
import { ConfigService } from '@nestjs/config';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import {
  AUCTION_RETRY_QUEUE_5S,
  X_RETRY_COUNT,
} from '../../infrastructure/rabbitmq/rabbitmq.constants';
import { RabbitMQEvent } from '../../infrastructure/rabbitmq/rabbitmq-event.types';
import * as amqpManager from 'amqp-connection-manager';
import type * as amqplib from 'amqplib';

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(),
}));

const mockAuctionsService = {
  cancelAllActiveAuctionsForSeller: jest.fn().mockResolvedValue(undefined),
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

describe('AuctionConsumer', () => {
  let consumer: AuctionConsumer;
  let handleMessage: HandleMessageFn;
  let mockChannel: {
    prefetch: jest.Mock;
    consume: jest.Mock;
    ack: jest.Mock;
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
        AuctionConsumer,
        {
          provide: AuctionsService,
          useValue: mockAuctionsService,
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

    consumer = module.get<AuctionConsumer>(AuctionConsumer);
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
        eventType: RabbitMQEvent.UserBanned,
        payload: { userId: 'u1' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue('1');

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
      expect(
        mockAuctionsService.cancelAllActiveAuctionsForSeller,
      ).not.toHaveBeenCalled();
    });

    it('should process UserBanned event and cancel all active auctions for seller', async () => {
      const messagePayload = {
        messageId: 'msg-ban-1',
        eventType: RabbitMQEvent.UserBanned,
        payload: { userId: 'seller-1' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(
        mockAuctionsService.cancelAllActiveAuctionsForSeller,
      ).toHaveBeenCalledWith('seller-1');
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should process UserSoftDeleted event and cancel all active auctions for seller', async () => {
      const messagePayload = {
        messageId: 'msg-del-1',
        eventType: RabbitMQEvent.UserSoftDeleted,
        payload: { userId: 'seller-2' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(
        mockAuctionsService.cancelAllActiveAuctionsForSeller,
      ).toHaveBeenCalledWith('seller-2');
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should re-queue to retry queue on processing error (attempt 1)', async () => {
      const messagePayload = {
        messageId: 'msg-err-1',
        eventType: RabbitMQEvent.UserBanned,
        payload: { userId: 'seller-1' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);
      mockAuctionsService.cancelAllActiveAuctionsForSeller.mockRejectedValue(
        new Error('DB Connection Timeout'),
      );

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        AUCTION_RETRY_QUEUE_5S,
        msg.content,
        expect.objectContaining({
          headers: {
            [X_RETRY_COUNT]: 1,
          },
        }),
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should reject to DLQ if max retries exceeded', async () => {
      const messagePayload = {
        messageId: 'msg-err-max',
        eventType: RabbitMQEvent.UserBanned,
        payload: { userId: 'seller-1' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: { [X_RETRY_COUNT]: 3 } },
      } as unknown as amqplib.ConsumeMessage;

      mockRedis.get.mockResolvedValue(null);
      mockAuctionsService.cancelAllActiveAuctionsForSeller.mockRejectedValue(
        new Error('Fatal DB Failure'),
      );

      await handleMessage(msg, mockChannel as unknown as amqplib.Channel);

      expect(mockChannel.reject).toHaveBeenCalledWith(msg, false);
    });
  });
});
