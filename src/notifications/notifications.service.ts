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
    const formattedTime = this.formatDate(metadata.time);

    await this.emailService.send(
      email,
      EmailSubjects.RESET_PASSWORD,
      EmailTemplates.RESET_PASSWORD,
      { resetLink, email, name, ...metadata, time: formattedTime },
    );
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';

    await this.emailService.send(
      email,
      EmailSubjects.WELCOME,
      EmailTemplates.WELCOME,
      { name, frontendUrl },
    );
  }

  async sendPasswordChangedEmail(
    email: string,
    name: string,
    date?: Date | string,
  ): Promise<void> {
    const formattedDate = this.formatDate(date);

    await this.emailService.send(
      email,
      EmailSubjects.PASSWORD_CHANGED,
      EmailTemplates.PASSWORD_CHANGED,
      { name, date: formattedDate },
    );
  }

  async sendOutbidEmail(
    email: string,
    name: string,
    auctionTitle: string,
    newAmount: number,
    auctionId: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;

    await this.emailService.send(
      email,
      EmailSubjects.OUTBID,
      EmailTemplates.OUTBID,
      { name, auctionTitle, newAmount, auctionLink },
    );
  }

  async sendAuctionWonEmail(
    email: string,
    name: string,
    auctionTitle: string,
    winningAmount: number,
    auctionId: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;

    await this.emailService.send(
      email,
      EmailSubjects.AUCTION_WON,
      EmailTemplates.AUCTION_WON,
      { name, auctionTitle, winningAmount, auctionLink },
    );
  }

  formatDate(dateInput?: Date | string): string {
    const date = dateInput ? new Date(dateInput) : new Date();
    const timeZone =
      this.configService.get<string>('APP_TIMEZONE') || 'Africa/Cairo';

    return (
      date.toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone,
      }) + ' (Cairo Time)'
    );
  }
}
