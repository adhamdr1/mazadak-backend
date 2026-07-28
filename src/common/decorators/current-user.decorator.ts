import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload | undefined => {
    const ctx = GqlExecutionContext.create(context);
    const gqlCtx = ctx.getContext<{
      req?: { user?: JwtPayload };
      user?: JwtPayload;
    }>();

    // 1. HTTP Path (Priority to guarantee no change to legacy queries/mutations)
    if (gqlCtx.req?.user) {
      return gqlCtx.req.user;
    }

    // 2. WebSocket Path (Subscriptions context)
    if (gqlCtx.user) {
      return gqlCtx.user;
    }

    return undefined;
  },
);
