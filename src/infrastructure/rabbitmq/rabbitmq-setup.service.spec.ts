import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMQSetupService } from './rabbitmq-setup.service';
import { ConfigService } from '@nestjs/config';
import * as amqpManager from 'amqp-connection-manager';
import {
  MAZADAK_EXCHANGE,
  DEAD_LETTER_QUEUE,
  NOTIFICATIONS_QUEUE,
  PAYMENTS_WEBHOOK_QUEUE,
  AUTH_QUEUE,
  WALLET_QUEUE,
  AUCTION_QUEUE,
} from './rabbitmq.constants';
import { RabbitMQEvent } from './rabbitmq-event.types';

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(),
}));

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('amqp://localhost:5672'),
};

describe('RabbitMQSetupService', () => {
  let service: RabbitMQSetupService;
  let mockChannel: {
    assertExchange: jest.Mock;
    assertQueue: jest.Mock;
    unbindQueue: jest.Mock;
    bindQueue: jest.Mock;
    close: jest.Mock;
  };
  let mockChannelWrapper: {
    waitForConnect: jest.Mock;
    close: jest.Mock;
  };
  let mockConnection: {
    createChannel: jest.Mock;
    close: jest.Mock;
    on: jest.Mock;
  };

  let setupCallback: (ch: unknown) => Promise<unknown>;

  beforeEach(async () => {
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      unbindQueue: jest.fn().mockResolvedValue(undefined),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockChannelWrapper = {
      waitForConnect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: jest
        .fn()
        .mockImplementation(
          (options: { setup: (ch: unknown) => Promise<unknown> }) => {
            setupCallback = options.setup;
            return mockChannelWrapper;
          },
        ),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    (amqpManager.connect as jest.Mock).mockReturnValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQSetupService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RabbitMQSetupService>(RabbitMQSetupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should assert exchange, queues, and explicit notification bindings', async () => {
      await service.onApplicationBootstrap();
      await setupCallback(mockChannel);

      expect(amqpManager.connect).toHaveBeenCalledWith([
        'amqp://localhost:5672',
      ]);
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        MAZADAK_EXCHANGE,
        'topic',
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(DEAD_LETTER_QUEUE, {
        durable: true,
      });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        NOTIFICATIONS_QUEUE,
        expect.any(Object),
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        PAYMENTS_WEBHOOK_QUEUE,
        expect.any(Object),
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        AUTH_QUEUE,
        expect.any(Object),
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        WALLET_QUEUE,
        expect.any(Object),
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        AUCTION_QUEUE,
        expect.any(Object),
      );

      // Verify explicit notification binding (e.g. AuctionStarted)
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        NOTIFICATIONS_QUEUE,
        MAZADAK_EXCHANGE,
        RabbitMQEvent.AuctionStarted,
      );

      // Verify unbind of wildcard
      expect(mockChannel.unbindQueue).toHaveBeenCalledWith(
        NOTIFICATIONS_QUEUE,
        MAZADAK_EXCHANGE,
        '#',
      );
    });

    it('should catch error without throwing if bootstrap setup fails', async () => {
      (amqpManager.connect as jest.Mock).mockImplementation(() => {
        throw new Error('Broker connection refused');
      });

      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close connection and channel wrapper', async () => {
      await service.onApplicationBootstrap();
      await service.onModuleDestroy();

      expect(mockChannelWrapper.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
