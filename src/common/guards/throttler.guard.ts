import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerException,
  InjectThrottlerOptions,
  InjectThrottlerStorage,
} from '@nestjs/throttler';
import type {
  ThrottlerModuleOptions,
  ThrottlerStorage,
  ThrottlerRequest,
} from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { IP_BLACKLIST_PREFIX } from '../middleware/ip-blacklist.middleware';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

// 1. تعريف واجهة مخصصة للـ Request عشان ESLint والـ Type Safety
export interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  // Override context for GraphQL with strict typing
  protected override getRequestResponse(context: ExecutionContext): {
    req: RequestWithUser;
    res: any;
  } {
    const ctx = GqlExecutionContext.create(context);
    const { req, res } = ctx.getContext<{
      req: RequestWithUser;
      res: Response;
    }>();

    return {
      req,
      res,
    };
  }

  // Use User ID if logged in, otherwise fallback to IP
  protected override async getTracker(
    req: Record<string, any>,
  ): Promise<string> {
    const request = req as RequestWithUser;
    if (request.user?.sub) {
      return request.user.sub;
    }
    return super.getTracker(req);
  }

  // Catch Rate Limit Exceeded & apply Automatic Blacklist for Strict endpoints
  protected override async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    try {
      return await super.handleRequest(requestProps);
    } catch (e) {
      if (
        e instanceof ThrottlerException &&
        requestProps.throttler.name === 'strict'
      ) {
        const { req } = this.getRequestResponse(requestProps.context);

        // لو مفيش IP أصلاً لأي سبب، ارمي Exception عادي من غير ما تعمل بلوك لـ unknown
        const ip = req.ip ?? req.socket?.remoteAddress;
        if (!ip) {
          throw new ThrottlerException(
            'Rate limit exceeded. Please try again later.',
          );
        }

        // هنجيب مدة العقوبة من .env (والديفولت 24 ساعة)
        const ttlSeconds = this.configService.get<number>(
          'STRICT_RATE_LIMIT_BLOCK_TTL',
          86400, // 24 Hours
        );

        // نحط الـ IP في البلاك ليست بتاع الـ Redis
        if (ttlSeconds > 0) {
          try {
            await this.redis.set(
              `${IP_BLACKLIST_PREFIX}${ip}`,
              'blocked',
              'EX',
              ttlSeconds,
            );
          } catch (error) {
            this.logger.error(`Failed to add IP ${ip} to blacklist`, error);
          }
        }

        // نرجع Error يدل إنه اتعمل له Block
        throw new ThrottlerException(
          'Rate limit exceeded. Your IP has been temporarily blocked due to suspicious activity.',
        );
      }

      if (e instanceof ThrottlerException) {
        // كسر الـ Global Limit العادي
        throw new ThrottlerException(
          'Rate limit exceeded. Please try again later.',
        );
      }

      throw e;
    }
  }
}
