import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
export declare const IP_BLACKLIST_PREFIX = "blacklist:ip:";
export declare class IpBlacklistMiddleware implements NestMiddleware {
    private readonly redis;
    constructor(redis: Redis);
    use(req: Request, _res: Response, next: NextFunction): Promise<void>;
}
