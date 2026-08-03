import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxEvent } from './outbox-event.schema';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { RabbitMQEventPayload } from '../rabbitmq/rabbitmq-event.types';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

const OUTBOX_WORKER_LOCK_KEY = 'outbox:worker:lock';
const LOCK_TTL_SECONDS = 10;

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);

  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEvent>,
    private readonly rabbitMQService: RabbitMQService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Polls the outbox_events collection every second for pending events
   * and dispatches them to RabbitMQ.
   * Uses a Redis distributed lock to avoid concurrent execution across multiple server instances.
   */
  @Cron(CronExpression.EVERY_SECOND)
  async dispatchPendingEvents(): Promise<void> {
    let acquiredLock = false;
    try {
      // SETNX with 10s TTL -- only one worker instance runs at a time
      const lockResult = await this.redis
        .set(OUTBOX_WORKER_LOCK_KEY, '1', 'EX', LOCK_TTL_SECONDS, 'NX')
        .catch((err) => {
          this.logger.warn(
            `Redis OutboxWorker lock error: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        });

      if (!lockResult) return;
      acquiredLock = true;

      const pendingEvents = await this.outboxModel
        .find({ publishedAt: null })
        .limit(50)
        .lean()
        .exec();

      if (pendingEvents.length === 0) return;

      this.logger.debug(`Dispatching ${pendingEvents.length} outbox event(s)`);

      for (const event of pendingEvents) {
        try {
          await this.rabbitMQService.publish(
            event.eventType,
            event.payload as unknown as RabbitMQEventPayload,
            event.correlationId,
          );

          await this.outboxModel.updateOne(
            { _id: event._id },
            { $set: { publishedAt: new Date() } },
          );
        } catch (err) {
          // Log per-event failures — other events in this batch continue
          this.logger.error(
            `Failed to dispatch outbox event [${event.eventType}] messageId=${event.messageId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `OutboxWorker batch error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      if (acquiredLock) {
        await this.redis.del(OUTBOX_WORKER_LOCK_KEY).catch(() => undefined);
      }
    }
  }
}
