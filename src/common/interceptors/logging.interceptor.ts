import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GraphQLResolveInfo } from 'graphql';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RequestContext } from '../context/request.context';

interface RequestWithUser {
  user?: {
    sub?: string;
  };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const type = context.getType<string>();

    let reqInfo = 'Unknown Request';
    let userId = RequestContext.getUserId() || 'anonymous';

    if (type === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const info = gqlContext.getInfo<GraphQLResolveInfo>();
      const parentType = info?.parentType?.name || 'GraphQL';
      const fieldName = info?.fieldName || 'Operation';

      const ctx = gqlContext.getContext<{ req?: RequestWithUser }>();
      if (ctx?.req?.user?.sub) {
        userId = ctx.req.user.sub;
        RequestContext.set('userId', userId);
      }

      reqInfo = `GraphQL ${parentType}.${fieldName}`;
    } else {
      const httpContext = context.switchToHttp();
      const req = httpContext.getRequest<
        RequestWithUser & { method?: string; url?: string }
      >();
      if (req) {
        const method = req.method || 'GET';
        const url = req.url || '/';

        if (req.user?.sub) {
          userId = req.user.sub;
          RequestContext.set('userId', userId);
        }

        reqInfo = `HTTP ${method} ${url}`;
      }
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          this.logger.info(
            `${reqInfo} | Status: SUCCESS | Duration: ${duration}ms`,
            { context: 'RequestLogger' },
          );
        },
        error: (err: unknown) => {
          const duration = Date.now() - now;
          let status = '500';
          if (err && typeof err === 'object') {
            const errorObj = err as Record<string, unknown>;
            if (
              typeof errorObj['status'] === 'number' ||
              typeof errorObj['status'] === 'string'
            ) {
              status = String(errorObj['status']);
            }
          }
          const message = (err as Error)?.message || 'Internal Server Error';
          this.logger.error(
            `${reqInfo} | Status: FAILED (${status}) | Duration: ${duration}ms | Error: ${message}`,
            { context: 'RequestLogger' },
          );
        },
      }),
    );
  }
}
