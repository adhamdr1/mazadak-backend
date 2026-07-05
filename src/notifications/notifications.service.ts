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
}
