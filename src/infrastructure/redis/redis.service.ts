import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { RELEASE_LOCK_LUA_SCRIPT } from './redis.constants';

const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const dateReviver = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return value;
};

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // soft expiration timestamp (ms)
}

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  // In-memory SingleFlight map: key -> pending Promise
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Get-or-set with Stale-While-Revalidate + SingleFlight + Graceful Fallback.
   *
   * @param key       - Redis key
   * @param softTtlMs - Time (ms) before data is considered stale (background refresh triggered)
   * @param hardTtlS  - Redis EX in seconds (hard expiration -- key deleted from Redis)
   * @param fetcher   - Async function that fetches fresh data from the DB
   */
  async getOrSetSWR<T>(
    key: string,
    softTtlMs: number,
    hardTtlS: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    // -- 1. Try to read from Redis -----------------------------------------------
    try {
      const raw = await this.redis.get(key);

      if (raw !== null) {
        const entry = JSON.parse(raw, dateReviver) as CacheEntry<T>;

        if (Date.now() < entry.expiresAt) {
          // Fresh cache hit
          this.logger.debug(`Cache HIT (fresh): ${key}`);
          return entry.data;
        }

        // Stale hit -- return immediately and revalidate in the background
        this.logger.debug(`Cache HIT (stale): ${key}`);
        void this.revalidateInBackground(key, softTtlMs, hardTtlS, fetcher);
        return entry.data;
      }
    } catch (err) {
      // Redis read failure -- fall through to DB (Graceful Fallback)
      this.logger.warn(
        `Cache READ error for key "${key}" -- falling back to DB: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // -- 2. Cold cache -- SingleFlight to avoid stampede -------------------------
    this.logger.debug(`Cache MISS: ${key}`);
    return this.singleFlight(key, async () => {
      const data = await fetcher();
      await this.setInRedis(key, data, softTtlMs, hardTtlS);
      return data;
    });
  }

  /**
   * Invalidate all Redis keys matching a pattern.
   * Uses SCAN (non-blocking) instead of KEYS.
   *
   * @param pattern - e.g. "auction:active:*"
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
          this.logger.debug(
            `Invalidated ${keys.length} key(s) matching "${pattern}"`,
          );
        }
      } while (cursor !== '0');
    } catch (err) {
      // Silent fail -- cache invalidation failure must never break a DB operation
      this.logger.warn(
        `Cache INVALIDATE error for pattern "${pattern}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // -- Private Helpers ---------------------------------------------------------

  /**
   * Collapse concurrent cold-cache requests into a single DB fetch.
   * In-memory Map; works per-process (sufficient for single-instance).
   * Cross-instance protection is handled by the Revalidation Lock in Redis.
   */
  private singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      this.logger.debug(
        `SingleFlight: waiting on in-flight request for "${key}"`,
      );
      return existing as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Revalidation lock (SETNX) prevents multiple background refreshes
   * for the same stale key. Only the first process to acquire the lock
   * will fetch from the DB.
   */
  private async revalidateInBackground<T>(
    key: string,
    softTtlMs: number,
    hardTtlS: number,
    fetcher: () => Promise<T>,
  ): Promise<void> {
    const lockKey = `revalidating:${key}`;
    const lockValue = randomUUID();
    let acquiredLock = false;
    try {
      // SETNX with 30s TTL -- only one revalidation worker at a time
      const acquired = await this.redis.set(lockKey, lockValue, 'EX', 30, 'NX');
      if (!acquired) {
        this.logger.debug(
          `Revalidation lock already held for "${key}" -- skipping`,
        );
        return;
      }
      acquiredLock = true;

      const data = await fetcher();
      await this.setInRedis(key, data, softTtlMs, hardTtlS);
      this.logger.debug(`Background revalidation complete for "${key}"`);
    } catch (err) {
      this.logger.warn(
        `Background revalidation error for "${key}": ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      // Always release the lock, even on error
      if (acquiredLock) {
        await this.redis
          .eval(RELEASE_LOCK_LUA_SCRIPT, 1, lockKey, lockValue)
          .catch(() => undefined);
      }
    }
  }

  /** Serialize and write a cache entry to Redis. */
  private async setInRedis<T>(
    key: string,
    data: T,
    softTtlMs: number,
    hardTtlS: number,
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        expiresAt: Date.now() + softTtlMs,
      };
      await this.redis.set(key, JSON.stringify(entry), 'EX', hardTtlS);
    } catch (err) {
      // Silent fail -- a write failure must not break the response
      this.logger.warn(
        `Cache WRITE error for key "${key}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
