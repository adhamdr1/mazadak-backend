import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { RequestContext } from '../context/request.context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string) || crypto.randomUUID();
    const correlationId =
      (req.headers['x-correlation-id'] as string) || requestId;

    // Set correlation headers in response
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);

    const store = new Map<string, any>();
    store.set('requestId', requestId);
    store.set('correlationId', correlationId);
    store.set('req', req);

    void RequestContext.run(store, () => {
      next();
    });
  }
}
