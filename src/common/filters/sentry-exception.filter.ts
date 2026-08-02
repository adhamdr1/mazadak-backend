import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import * as Sentry from '@sentry/nestjs';
import { RequestContext } from '../context/request.context';

@Injectable()
@Catch()
export class SentryExceptionFilter
  extends BaseExceptionFilter
  implements GqlExceptionFilter
{
  override catch(exception: unknown, host: ArgumentsHost) {
    const type = host.getType<string>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
    }

    // 1. Filter out business/user exceptions (HTTP status < 500)
    // Sentry should only capture 5xx errors or completely unhandled errors.
    const isUnhandled = status >= 500;

    if (isUnhandled) {
      const requestId = RequestContext.getRequestId() || 'system';
      const correlationId = RequestContext.getCorrelationId() || 'system';
      const userId = RequestContext.getUserId() || 'anonymous';

      Sentry.withScope((scope) => {
        scope.setTag('requestId', requestId);
        scope.setTag('correlationId', correlationId);
        scope.setUser({ id: userId });

        if (type === 'graphql') {
          const gqlHost = GqlArgumentsHost.create(host);
          const ctx = gqlHost.getContext<{
            req?: { headers?: Record<string, string> };
          }>();
          const info = gqlHost.getInfo<{ fieldName?: string }>();
          const args = gqlHost.getArgs<Record<string, unknown>>();

          // Scrub sensitive variables
          const cleanArgs = this.scrubSensitiveData(args);

          scope.setExtra('graphql_query', info?.fieldName || 'unknown');
          scope.setExtra('graphql_args', cleanArgs);

          if (ctx?.req?.headers) {
            const cleanHeaders = this.scrubSensitiveData(ctx.req.headers);
            scope.setExtra('headers', cleanHeaders);
          }
        } else {
          const ctx = host.switchToHttp();
          const req = ctx.getRequest<{
            url?: string;
            method?: string;
            headers?: Record<string, string>;
            body?: Record<string, unknown>;
            query?: Record<string, unknown>;
          }>();
          if (req) {
            const cleanHeaders = this.scrubSensitiveData(req.headers || {});
            const cleanBody = this.scrubSensitiveData(req.body || {});
            const cleanQuery = this.scrubSensitiveData(req.query || {});

            scope.setExtra('url', req.url);
            scope.setExtra('method', req.method);
            scope.setExtra('headers', cleanHeaders);
            scope.setExtra('body', cleanBody);
            scope.setExtra('query', cleanQuery);
          }
        }

        Sentry.captureException(exception);
      });
    }

    // For GraphQL, we just throw the exception so that Apollo driver can format it.
    if (type === 'graphql') {
      throw exception;
    }

    super.catch(exception, host);
  }

  private scrubSensitiveData(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = [
      'password',
      'token',
      'refreshtoken',
      'otp',
      'cardnumber',
      'secret',
      'authorization',
      'cookie',
    ];
    const clean = { ...data };

    for (const key of Object.keys(clean)) {
      const value = clean[key];
      if (sensitiveKeys.includes(key.toLowerCase())) {
        clean[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        clean[key] = this.scrubSensitiveData(value as Record<string, unknown>);
      }
    }
    return clean;
  }
}
