// test-email.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NotificationsService } from './src/notifications/notifications.service';

async function bootstrap() {
  // إنشاء بيئة NestJS بدون تشغيل سيرفر الـ HTTP/GraphQL
  const app = await NestFactory.createApplicationContext(AppModule);

  // استدعاء الـ NotificationsService
  const notificationsService = app.get(NotificationsService);

  console.log('Sending test email...');

  try {
    await notificationsService.sendEmailVerification(
      'test@example.com', // الإيميل المراد الإرسال إليه
      'dummy-token-12345',
      'Adham',
      '+201234567890',
    );
    console.log('✅ Email sent successfully! Check your Mailtrap inbox.');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  } finally {
    // إغلاق التطبيق بعد الانتهاء
    await app.close();
  }
}

bootstrap();
