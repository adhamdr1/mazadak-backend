import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { IncomingMessage, ServerResponse } from 'http';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import * as Sentry from '@sentry/nestjs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

async function bootstrap() {
  // Initialize Sentry before app bootstrap
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  // Set Winston as global logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4000',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  // Set payload limit for request body (1mb)
  // We add verify hook to preserve rawBody for signature verification
  app.use(
    express.json({
      limit: '1mb',
      verify: (
        req: IncomingMessage & { rawBody?: Buffer },
        _res: ServerResponse,
        buf: Buffer,
      ) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(
    express.urlencoded({
      limit: '1mb',
      extended: true,
      verify: (
        req: IncomingMessage & { rawBody?: Buffer },
        _res: ServerResponse,
        buf: Buffer,
      ) => {
        req.rawBody = buf;
      },
    }),
  );

  // السطر ده هو اللي بيفعل الـ Validation على مستوى المشروع كله
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // بيقص أي داتا زيادة الهاكر يبعتها مش موجودة في الـ DTO
      forbidNonWhitelisted: true, // بيرفض الطلب كله لو فيه داتا غريبة
      transform: true, // بيحول الـ Strings لـ Objects (زي التاريخ)
    }),
  );

  // Global Exception Filter for Sentry and error shielding
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Error starting server:', err);
});
