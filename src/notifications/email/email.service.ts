import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { INotificationProvider } from '../interfaces/notification-provider.interface';
import { NotificationFailedException } from '../exceptions/notification-failed.exception';

@Injectable()
export class EmailService implements INotificationProvider {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async send(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context,
      });
      this.logger.log(`Email successfully sent to: ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new NotificationFailedException('Email Service Error', error);
    }
  }
}
