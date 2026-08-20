import { Test, TestingModule } from '@nestjs/testing';
import { WebhookConsumer } from './webhook.consumer';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../payment.service';
import { RabbitMQEvent } from '../../infrastructure/rabbitmq/rabbitmq-event.types';
import {
  WEBHOOK_RETRY_QUEUE_5S,
  WEBHOOK_RETRY_QUEUE_30S,
  WEBHOOK_RETRY_QUEUE_2M,
  X_RETRY_COUNT,
} from '../../infrastructure/rabbitmq/rabbitmq.constants';
import * as amqpManager from 'amqp-connection-manager';
import type * as amqplib from 'amqplib';

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(),
}));

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('amqp://localhost:5672'),
};

const mockPaymentService = {
  processPaymentWebhookEvent: jest.fn(),
};

type ConsumeCallback = (msg: amqplib.ConsumeMessage | null) => Promise<void>;

describe('WebhookConsumer', () => {
  let consumer: WebhookConsumer;
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
  let consumeHandler: ConsumeCallback;

  beforeEach(async () => {
    mockChannel = {
      prefetch: jest.fn().mockResolvedValue(undefined),
      consume: jest
        .fn()
        .mockImplementation((_queue: string, cb: ConsumeCallback) => {
          consumeHandler = cb;
          return Promise.resolve();
        }),
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
      createChannel: jest
        .fn()
        .mockImplementation(
          (options: { setup: (ch: unknown) => Promise<unknown> }) => {
            void options.setup(mockChannel);
            return mockChannelWrapper;
          },
        ),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (amqpManager.connect as jest.Mock).mockReturnValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookConsumer,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    consumer = module.get<WebhookConsumer>(WebhookConsumer);
    consumer.onApplicationBootstrap();
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

      await consumeHandler(msg);

      expect(mockChannel.reject).toHaveBeenCalledWith(msg, false);
      expect(
        mockPaymentService.processPaymentWebhookEvent,
      ).not.toHaveBeenCalled();
    });

    it('should process valid PaymentWebhookReceived event and ack message', async () => {
      const messagePayload = {
        eventType: RabbitMQEvent.PaymentWebhookReceived,
        payload: {
          providerEventId: 'evt_123',
          provider: 'STRIPE',
          payload: {},
        },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockPaymentService.processPaymentWebhookEvent.mockResolvedValue(
        undefined,
      );

      await consumeHandler(msg);

      expect(
        mockPaymentService.processPaymentWebhookEvent,
      ).toHaveBeenCalledWith(messagePayload.payload);
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('should re-queue to 5s retry queue on first failure', async () => {
      const messagePayload = {
        eventType: RabbitMQEvent.PaymentWebhookReceived,
        payload: { providerEventId: 'evt_123' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: {} },
      } as unknown as amqplib.ConsumeMessage;

      mockPaymentService.processPaymentWebhookEvent.mockRejectedValue(
        new Error('Process error'),
      );

      await consumeHandler(msg);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        WEBHOOK_RETRY_QUEUE_5S,
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
        eventType: RabbitMQEvent.PaymentWebhookReceived,
        payload: { providerEventId: 'evt_123' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: { [X_RETRY_COUNT]: 1 } },
      } as unknown as amqplib.ConsumeMessage;

      mockPaymentService.processPaymentWebhookEvent.mockRejectedValue(
        new Error('Process error'),
      );

      await consumeHandler(msg);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        WEBHOOK_RETRY_QUEUE_30S,
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
        eventType: RabbitMQEvent.PaymentWebhookReceived,
        payload: { providerEventId: 'evt_123' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: { [X_RETRY_COUNT]: 2 } },
      } as unknown as amqplib.ConsumeMessage;

      mockPaymentService.processPaymentWebhookEvent.mockRejectedValue(
        new Error('Process error'),
      );

      await consumeHandler(msg);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        WEBHOOK_RETRY_QUEUE_2M,
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
        eventType: RabbitMQEvent.PaymentWebhookReceived,
        payload: { providerEventId: 'evt_123' },
      };

      const msg = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        properties: { headers: { [X_RETRY_COUNT]: 3 } },
      } as unknown as amqplib.ConsumeMessage;

      mockPaymentService.processPaymentWebhookEvent.mockRejectedValue(
        new Error('Final error'),
      );

      await consumeHandler(msg);

      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
      expect(mockChannel.sendToQueue).not.toHaveBeenCalled();
    });

    it('should ignore null message', async () => {
      await consumeHandler(null);

      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });
});
