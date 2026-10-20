import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerModuleOptions, type ThrottlerStorage, type ThrottlerRequest } from '@nestjs/throttler';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
export interface RequestWithUser extends Request {
    user?: JwtPayload;
}
export declare class CustomThrottlerGuard extends ThrottlerGuard {
    private readonly redis;
    private readonly configService;
    private readonly logger;
    constructor(options: ThrottlerModuleOptions, storageService: ThrottlerStorage, reflector: Reflector, redis: Redis, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    protected getRequestResponse(context: ExecutionContext): {
        req: RequestWithUser;
        res: Record<string, unknown>;
    };
    protected getTracker(req: Record<string, any>): Promise<string>;
    protected handleRequest(requestProps: ThrottlerRequest): Promise<boolean>;
}
