import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

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
