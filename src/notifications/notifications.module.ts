import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import {
  InAppNotification,
  InAppNotificationSchema,
} from './in-app/entities/in-app-notification.entity';
import { InAppNotificationsService } from './in-app/in-app-notifications.service';
import { InAppNotificationsResolver } from './in-app/in-app-notifications.resolver';
import { MongoInAppNotificationRepository } from './in-app/repositories/mongo.in-app-notification.repository';
import { RabbitMQModule } from '../infrastructure/rabbitmq/rabbitmq.module';
import { RedisModule as AppRedisModule } from '../infrastructure/redis/redis.module';
import { UsersModule } from '../users/users.module';
import { NotificationsConsumer } from './notifications.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InAppNotification.name, schema: InAppNotificationSchema },
    ]),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow<string>('SMTP_HOST'),
          port: parseInt(configService.getOrThrow('SMTP_PORT'), 10),
          secure: configService.get('SMTP_SECURE') === 'true',
          auth: {
            user: configService.getOrThrow<string>('SMTP_USER'),
            pass: configService.getOrThrow<string>('SMTP_PASS'),
          },
        },
        defaults: {
          from: `"Mazadak Support" <${configService.get<string>('SMTP_FROM')}>`,
        },
        template: {
          dir: join(__dirname, 'email', 'templates'), // مسار قوالب الإيميل
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
    RabbitMQModule,
    AppRedisModule,
    UsersModule,
  ],
  providers: [
    EmailService,
    NotificationsService,
    InAppNotificationsService,
    InAppNotificationsResolver,
    {
      provide: 'IInAppNotificationRepository',
      useClass: MongoInAppNotificationRepository,
    },
    NotificationsConsumer,
  ],
  exports: [EmailService, NotificationsService, InAppNotificationsService],
})
export class NotificationsModule {}
