import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { EmailSubjects, EmailTemplates } from './enums/notification.enum';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmailVerification(
    email: string,
    token: string,
    name: string,
    phone: string,
  ): Promise<void> {
    const confirmLink = `${this.configService.getOrThrow('FRONTEND_URL')}/auth/confirm-email?token=${token}`;

    await this.emailService.send(
      email,
      EmailSubjects.CONFIRM_EMAIL,
      EmailTemplates.CONFIRM_EMAIL,
      { confirmLink, name, email, phone },
    );
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    user: { firstName?: string; lastName?: string },
    metadata: { ip: string; browser: string; time: string },
  ): Promise<void> {
    const resetLink = `${this.configService.getOrThrow('FRONTEND_URL')}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    await this.emailService.send(
      email,
      EmailSubjects.RESET_PASSWORD,
      EmailTemplates.RESET_PASSWORD,
      { resetLink, email, name, ...metadata },
    );
  }
}
