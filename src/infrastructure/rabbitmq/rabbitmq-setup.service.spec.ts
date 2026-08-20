import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMQSetupService } from './rabbitmq-setup.service';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import {
  MAZADAK_EXCHANGE,
  DEAD_LETTER_QUEUE,
  NOTIFICATIONS_QUEUE,
  PAYMENTS_WEBHOOK_QUEUE,
  AUTH_QUEUE,
  WALLET_QUEUE,
  AUCTION_QUEUE,
} from './rabbitmq.constants';

jest.mock('amqplib', () => ({
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
    bindQueue: jest.Mock;
    close: jest.Mock;
  };
  let mockConnection: {
    createChannel: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(async () => {
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (amqplib.connect as jest.Mock).mockResolvedValue(mockConnection);

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
    it('should assert exchange, queues, bindings, and close connection', async () => {
      await service.onApplicationBootstrap();

      expect(amqplib.connect).toHaveBeenCalledWith('amqp://localhost:5672');
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
      expect(mockChannel.bindQueue).toHaveBeenCalled();
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should catch error without rethrowing if connection fails', async () => {
      (amqplib.connect as jest.Mock).mockRejectedValue(
        new Error('Broker connection refused'),
      );

      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });
  });
});
