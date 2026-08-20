import { Test, TestingModule } from '@nestjs/testing';
import { OutboxWorkerService } from './outbox-worker.service';
import { getModelToken } from '@nestjs/mongoose';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { OutboxEvent } from './outbox-event.schema';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { RabbitMQEvent } from '../rabbitmq/rabbitmq-event.types';
import { Types } from 'mongoose';

const mockOutboxModel = {
  find: jest.fn(),
  updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
};

const mockRabbitMQService = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockRedis = {
  set: jest.fn(),
  eval: jest.fn().mockResolvedValue(1),
};

describe('OutboxWorkerService', () => {
  let service: OutboxWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorkerService,
        {
          provide: getModelToken(OutboxEvent.name),
          useValue: mockOutboxModel,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: getRedisConnectionToken('default'),
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<OutboxWorkerService>(OutboxWorkerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('dispatchPendingEvents', () => {
    it('should return early if lock is not acquired', async () => {
      mockRedis.set.mockResolvedValue(null);

      await service.dispatchPendingEvents();

      expect(mockOutboxModel.find).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should return early if no pending events found and release lock', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockOutboxModel.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await service.dispatchPendingEvents();

      expect(mockRabbitMQService.publish).not.toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should dispatch pending events, update publishedAt, and release lock', async () => {
      const event1 = {
        _id: new Types.ObjectId(),
        eventType: RabbitMQEvent.UserBanned,
        payload: { userId: 'u1' },
        correlationId: 'corr-1',
        messageId: 'msg-1',
      };
      const event2 = {
        _id: new Types.ObjectId(),
        eventType: RabbitMQEvent.WalletDeposited,
        payload: { userId: 'u2', amount: 100 },
        correlationId: 'corr-2',
        messageId: 'msg-2',
      };

      mockRedis.set.mockResolvedValue('OK');
      mockOutboxModel.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([event1, event2]),
          }),
        }),
      });

      await service.dispatchPendingEvents();

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        event1.eventType,
        event1.payload,
        event1.correlationId,
        event1.messageId,
      );
      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        event2.eventType,
        event2.payload,
        event2.correlationId,
        event2.messageId,
      );
      expect(mockOutboxModel.updateOne).toHaveBeenCalledTimes(2);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should catch per-event errors and continue dispatching next events', async () => {
      const event1 = {
        _id: new Types.ObjectId(),
        eventType: RabbitMQEvent.UserBanned,
        payload: { userId: 'u1' },
        correlationId: 'corr-1',
        messageId: 'msg-1',
      };
      const event2 = {
        _id: new Types.ObjectId(),
        eventType: RabbitMQEvent.WalletDeposited,
        payload: { userId: 'u2', amount: 100 },
        correlationId: 'corr-2',
        messageId: 'msg-2',
      };

      mockRedis.set.mockResolvedValue('OK');
      mockOutboxModel.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([event1, event2]),
          }),
        }),
      });

      mockRabbitMQService.publish.mockRejectedValueOnce(
        new Error('Connection lost'),
      );

      await service.dispatchPendingEvents();

      expect(mockRabbitMQService.publish).toHaveBeenCalledTimes(2);
      expect(mockOutboxModel.updateOne).toHaveBeenCalledTimes(1);
      expect(mockRedis.eval).toHaveBeenCalled();
    });
  });
});
