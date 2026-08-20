import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { EscrowService } from './escrow.service';
import { RELEASE_LOCK_LUA_SCRIPT } from '../../infrastructure/redis/redis.constants';

const ESCROW_EXPIRATION_LOCK_KEY = 'escrow:expiration:lock';
const LOCK_TTL_SECONDS = 30;

@Injectable()
export class EscrowExpirationService {
  private readonly logger = new Logger(EscrowExpirationService.name);

  constructor(
    private readonly escrowService: EscrowService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Periodically auto-releases HELD escrows whose 7-day inspection window has expired without disputes.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredHeldEscrows(): Promise<void> {
    let acquiredLock = false;
    const lockValue = randomUUID();

    try {
      const lockResult = await this.redis
        .set(
          ESCROW_EXPIRATION_LOCK_KEY,
          lockValue,
          'EX',
          LOCK_TTL_SECONDS,
          'NX',
        )
        .catch((err) => {
          this.logger.warn(
            `Redis EscrowExpirationService lock error: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        });

      if (!lockResult) return;
      acquiredLock = true;

      const releasedCount =
        await this.escrowService.releaseExpiredHeldEscrows();

      if (releasedCount > 0) {
        this.logger.log(
          `Auto-released ${releasedCount} expired held escrow(s) to seller(s).`,
        );
      }
    } catch (err) {
      this.logger.error(
        `EscrowExpirationService error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      if (acquiredLock) {
        await this.redis
          .eval(
            RELEASE_LOCK_LUA_SCRIPT,
            1,
            ESCROW_EXPIRATION_LOCK_KEY,
            lockValue,
          )
          .catch(() => undefined);
      }
    }
  }
}
