import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';

@Module({
  imports: [
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
  ],
  providers: [EmailService, NotificationsService],
  exports: [EmailService, NotificationsService],
})
export class NotificationsModule {}
