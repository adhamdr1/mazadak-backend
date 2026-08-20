import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMQService } from './rabbitmq.service';
import { ConfigService } from '@nestjs/config';
import { RabbitMQEvent } from './rabbitmq-event.types';
import { MAZADAK_EXCHANGE } from './rabbitmq.constants';
import * as amqpManager from 'amqp-connection-manager';

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(),
}));

interface PublishedMessageWrapper {
  pattern: { exchange: string; routingKey: string };
  data: {
    messageId: string;
    correlationId: string;
    eventType: string;
    payload: unknown;
  };
}

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('amqp://localhost:5672'),
};

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let mockChannelWrapper: {
    publish: jest.Mock;
    close: jest.Mock;
  };
  let mockConnection: {
    createChannel: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(async () => {
    mockChannelWrapper = {
      publish: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: jest
        .fn()
        .mockImplementation((options: { setup: (ch: unknown) => unknown }) => {
          const mockChannel = {
            assertExchange: jest.fn().mockResolvedValue(undefined),
          };
          options.setup(mockChannel);
          return mockChannelWrapper;
        }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (amqpManager.connect as jest.Mock).mockReturnValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RabbitMQService>(RabbitMQService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('lifecycle', () => {
    it('should connect and create channel on module init', () => {
      expect(amqpManager.connect).toHaveBeenCalledWith([
        'amqp://localhost:5672',
      ]);
      expect(mockConnection.createChannel).toHaveBeenCalled();
    });

    it('should close connection and channel on module destroy', async () => {
      await service.onModuleDestroy();

      expect(mockChannelWrapper.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should publish message with custom correlationId and messageId', async () => {
      const payload = { userId: 'u1' };

      await service.publish(
        RabbitMQEvent.UserBanned,
        payload,
        'corr-123',
        'msg-456',
      );

      expect(mockChannelWrapper.publish).toHaveBeenCalled();
      const calls = mockChannelWrapper.publish.mock.calls as [
        string,
        string,
        PublishedMessageWrapper,
        { persistent: boolean },
      ][];
      const call = calls[0];
      expect(call[0]).toBe(MAZADAK_EXCHANGE);
      expect(call[1]).toBe(RabbitMQEvent.UserBanned);
      expect(call[2].data.messageId).toBe('msg-456');
      expect(call[2].data.correlationId).toBe('corr-123');
      expect(call[2].data.eventType).toBe(RabbitMQEvent.UserBanned);
      expect(call[2].data.payload).toEqual(payload);
      expect(call[3]).toEqual({ persistent: true });
    });

    it('should publish message with auto-generated correlationId and messageId', async () => {
      const payload = { userId: 'u2' };

      await service.publish(RabbitMQEvent.UserBanned, payload);

      expect(mockChannelWrapper.publish).toHaveBeenCalled();
      const calls = mockChannelWrapper.publish.mock.calls as [
        string,
        string,
        PublishedMessageWrapper,
        { persistent: boolean },
      ][];
      const call = calls[0];
      expect(call[0]).toBe(MAZADAK_EXCHANGE);
      expect(call[1]).toBe(RabbitMQEvent.UserBanned);
      expect(typeof call[2].data.messageId).toBe('string');
      expect(typeof call[2].data.correlationId).toBe('string');
      expect(call[2].data.eventType).toBe(RabbitMQEvent.UserBanned);
      expect(call[2].data.payload).toEqual(payload);
      expect(call[3]).toEqual({ persistent: true });
    });

    it('should throw error if channelWrapper is null', async () => {
      const uninitService = new RabbitMQService(
        mockConfigService as unknown as ConfigService,
      );

      await expect(
        uninitService.publish(RabbitMQEvent.UserBanned, { userId: 'u1' }),
      ).rejects.toThrow('RabbitMQ channel wrapper is not initialized');
    });

    it('should throw and log error if channelWrapper.publish rejects', async () => {
      mockChannelWrapper.publish.mockRejectedValue(
        new Error('Broker unreachable'),
      );

      await expect(
        service.publish(RabbitMQEvent.UserBanned, { userId: 'u1' }),
      ).rejects.toThrow('Broker unreachable');
    });
  });
});
