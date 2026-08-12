import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';
import { AccountBannedException } from '../exceptions/account-banned.exception';
import { AccountSoftDeletedException } from '../exceptions/account-soft-deleted.exception';
import { UserNotFoundException } from '../../users/exceptions/user-not-found.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const cacheKey = `user:auth-status:${payload.sub}`;

    // 1. Fetch cached status and remaining TTL in a single Redis roundtrip using pipeline
    const results = await this.redis
      .pipeline()
      .get(cacheKey)
      .ttl(cacheKey)
      .exec();

    const cachedStatus = results?.[0]?.[1] as string | null;
    const ttl = (results?.[1]?.[1] as number) ?? 0;

    if (cachedStatus) {
      // Early background refresh window: if key is in its final minute (TTL <= 60 seconds)
      // we trigger a background refresh to prevent cache stampedes.
      if (ttl > 0 && ttl <= 60) {
        this.triggerBackgroundRefresh(payload.sub, cacheKey);
      }

      if (cachedStatus === 'banned') {
        throw new AccountBannedException();
      }
      if (cachedStatus === 'deleted') {
        throw new AccountSoftDeletedException();
      }
      return payload;
    }

    // 2. Cache miss: perform a blocking DB check for the first request
    const status = await this.dbCheckAndCache(payload.sub, cacheKey);
    if (status === 'banned') {
      throw new AccountBannedException();
    }
    if (status === 'deleted') {
      throw new AccountSoftDeletedException();
    }

    return payload;
  }

  /**
   * Triggers an asynchronous background refresh of the user's status.
   * Uses a temporary lock key to ensure only one concurrent request executes the database query.
   */
  private triggerBackgroundRefresh(userId: string, cacheKey: string): void {
    const lockKey = `${cacheKey}:refresh-lock`;

    // Try to acquire the refresh lock for 15 seconds
    this.redis
      .set(lockKey, 'true', 'EX', 15, 'NX')
      .then((acquired) => {
        if (acquired === 'OK') {
          // Perform the refresh asynchronously in the background
          this.dbCheckAndCache(userId, cacheKey).catch(() => {
            // Delete the lock in case of failure to allow subsequent retries
            this.redis.del(lockKey).catch(() => undefined);
          });
        }
      })
      .catch(() => undefined);
  }

  /**
   * Queries the database for user status and updates the Redis cache.
   * Business-level "Not Found" is cached as deleted, while transient DB/network failures
   * are propagated immediately without caching.
   */
  private async dbCheckAndCache(
    userId: string,
    cacheKey: string,
  ): Promise<string> {
    let status = 'active';
    let user: User | null = null;

    try {
      user = await this.usersService.findByIdIncludingDeleted(userId);
    } catch (err) {
      if (err instanceof UserNotFoundException) {
        // Business state: User does not exist in DB. We cache this negative status.
        status = 'deleted';
      } else {
        // System/Network failure: Propagate the exception without caching.
        throw err;
      }
    }

    // If query succeeded but user is soft-deleted or null
    if (!user || user.deletedAt) {
      status = 'deleted';
    } else if (user.isBanned) {
      status = 'banned';
    }

    // Cache status for 5 minutes (300 seconds)
    await this.redis.set(cacheKey, status, 'EX', 300);

    // Release the refresh lock immediately
    await this.redis.del(`${cacheKey}:refresh-lock`).catch(() => undefined);

    return status;
  }
}
