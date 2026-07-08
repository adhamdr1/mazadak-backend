import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export const IP_BLACKLIST_PREFIX = 'blacklist:ip:';

@Injectable()
export class IpBlacklistMiddleware implements NestMiddleware {
  // @nestjs-modules/ioredis currently resolves to `any` under ESLint with NodeNext.
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const isBlocked = await this.redis.get(`${IP_BLACKLIST_PREFIX}${ip}`);

    if (isBlocked) {
      throw new ForbiddenException('Access denied');
    }

    next();
  }
}
