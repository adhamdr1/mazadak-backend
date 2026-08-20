import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService } from './outbox.service';
import { getModelToken } from '@nestjs/mongoose';
import { OutboxEvent } from './outbox-event.schema';
import { RabbitMQEvent } from '../rabbitmq/rabbitmq-event.types';
import type { ClientSession } from 'mongoose';

const mockOutboxModel = {
  create: jest.fn().mockResolvedValue([]),
};

const mockSession = {} as ClientSession;

describe('OutboxService', () => {
  let service: OutboxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: getModelToken(OutboxEvent.name),
          useValue: mockOutboxModel,
        },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveEvent', () => {
    it('should save outbox event with session and custom correlationId', async () => {
      const payload = { userId: 'u1' };

      await service.saveEvent(
        RabbitMQEvent.UserBanned,
        payload,
        mockSession,
        'corr-123',
      );

      expect(mockOutboxModel.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            eventType: RabbitMQEvent.UserBanned,
            payload,
            correlationId: 'corr-123',
            publishedAt: null,
          }),
        ],
        { session: mockSession },
      );
    });

    it('should save outbox event without session and generate default correlationId', async () => {
      const payload = { userId: 'u2' };

      await service.saveEvent(RabbitMQEvent.UserBanned, payload);

      expect(mockOutboxModel.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            eventType: RabbitMQEvent.UserBanned,
            payload,
            publishedAt: null,
          }),
        ],
        undefined,
      );
    });
  });
});
