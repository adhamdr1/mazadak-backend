import { NestFactory, HttpAdapterHost } from '@nestjs/core';
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
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors();

  // Increase payload limit for Base64 image uploads (Default is 100kb, we set it to 50mb)
  // We add verify hook to preserve rawBody for signature verification
  app.use(
    express.json({
      limit: '50mb',
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
      limit: '50mb',
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

  await app.listen(3000);
}

bootstrap().catch((err) => {
  console.error('Error starting server:', err);
});
