import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      const gqlCtx = ctx.getContext<{
        req?: { user?: JwtPayload; headers?: unknown };
        user?: JwtPayload;
      }>();

      // WebSocket Subscription path: user was authenticated in onConnect & stored in context.user.
      if (gqlCtx.user) {
        if (gqlCtx.req) {
          gqlCtx.req.user = gqlCtx.user;
        }
        return true;
      }

      // If there is no HTTP request with headers, this is a WS context with no valid user.
      // Do not fall through to passport (it crashes reading req.headers.authorization).
      if (!gqlCtx.req?.headers) {
        return false;
      }
    }

    const result = await super.canActivate(context);
    return result as boolean;
  }

  override getRequest(context: ExecutionContext) {
    if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      const gqlCtx = ctx.getContext<{
        req?: Request & { headers?: Record<string, string> };
        user?: JwtPayload;
      }>();
      // For WS subscriptions, context.req may be the raw `extra` object (no HTTP headers).
      // passport-jwt would crash trying to read req.headers.authorization on it.
      // We only forward req to passport when it looks like a real HTTP request.
      const req = gqlCtx.req;
      if (req?.headers) return req;
      // For subscriptions: canActivate already handled auth via gqlCtx.user above.
      // Return an empty object so passport doesn't crash — it won't be reached anyway.
      return req ?? {};
    }
    return context.switchToHttp().getRequest<Request>();
  }
}
