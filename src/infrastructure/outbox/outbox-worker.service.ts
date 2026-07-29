import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxEvent } from './outbox-event.schema';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { RabbitMQEventPayload } from '../rabbitmq/rabbitmq-event.types';

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  /** Prevent concurrent runs of the same cron invocation */
  private isRunning = false;

  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEvent>,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Polls the outbox_events collection every second for pending events
   * and dispatches them to RabbitMQ.
   * Uses a process-level lock (isRunning) to avoid overlapping executions.
   */
  @Cron(CronExpression.EVERY_SECOND)
  async dispatchPendingEvents(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
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
      this.isRunning = false;
    }
  }
}
