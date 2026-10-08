import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload | undefined => {
    if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      const gqlCtx = ctx.getContext<{
        req?: { user?: JwtPayload };
        user?: JwtPayload;
        extra?: { user?: JwtPayload };
      }>();

      return gqlCtx.user || gqlCtx.extra?.user || gqlCtx.req?.user;
    } else {
      const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
      return req.user;
    }

    return undefined;
  },
);
