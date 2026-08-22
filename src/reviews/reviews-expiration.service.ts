import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { ReviewsService } from './reviews.service';
import { RELEASE_LOCK_LUA_SCRIPT } from '../infrastructure/redis/redis.constants';

const EXPIRATION_LOCK_KEY = 'reviews:expiration:lock';
const LOCK_TTL_SECONDS = 600;

@Injectable()
export class ReviewsExpirationService {
  private readonly logger = new Logger(ReviewsExpirationService.name);

  constructor(
    private readonly reviewsService: ReviewsService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Periodically auto-publishes PENDING reviews whose reveal deadline (expiresAt)
   * has passed, ensuring the blind review window resolves even if the counterparty never reviews.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredPendingReviews(): Promise<void> {
    let acquiredLock = false;
    const lockValue = randomUUID();

    try {
      const lockResult = await this.redis
        .set(EXPIRATION_LOCK_KEY, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX')
        .catch((err) => {
          this.logger.warn(
            `Redis ReviewsExpirationWorker lock error: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        });

      if (!lockResult) return;
      acquiredLock = true;

      const publishedCount =
        await this.reviewsService.publishExpiredPendingReviews();

      if (publishedCount > 0) {
        this.logger.log(
          `Auto-published ${publishedCount} expired pending review(s).`,
        );
      }
    } catch (err) {
      this.logger.error(
        `ReviewsExpirationService error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      if (acquiredLock) {
        await this.redis
          .eval(RELEASE_LOCK_LUA_SCRIPT, 1, EXPIRATION_LOCK_KEY, lockValue)
          .catch(() => undefined);
      }
    }
  }
}
