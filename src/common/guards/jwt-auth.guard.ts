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
        req?: { user?: JwtPayload };
        user?: JwtPayload;
      }>();
      if (gqlCtx.user) {
        if (gqlCtx.req) {
          gqlCtx.req.user = gqlCtx.user;
        }
        return true;
      }
    }

    const result = await super.canActivate(context);
    return result as boolean;
  }

  override getRequest(context: ExecutionContext) {
    if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      return ctx.getContext<{ req: Request }>().req;
    }
    return context.switchToHttp().getRequest<Request>();
  }
}
