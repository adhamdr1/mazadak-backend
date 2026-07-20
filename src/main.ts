import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors();

  // Increase payload limit for Base64 image uploads (Default is 100kb, we set it to 50mb)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // السطر ده هو اللي بيفعل الـ Validation على مستوى المشروع كله
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // بيقص أي داتا زيادة الهاكر يبعتها مش موجودة في الـ DTO
      forbidNonWhitelisted: true, // بيرفض الطلب كله لو فيه داتا غريبة
      transform: true, // بيحول الـ Strings لـ Objects (زي التاريخ)
    }),
  );

  await app.listen(3000);
}

bootstrap().catch((err) => {
  console.error('Error starting server:', err);
});
