import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    let user: JwtPayload | undefined;
    if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      user = ctx.getContext<{ req: { user?: JwtPayload } }>().req?.user;
    } else {
      const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
      user = req?.user;
    }

    if (!user) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
