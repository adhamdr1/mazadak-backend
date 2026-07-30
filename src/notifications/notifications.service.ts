import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { EmailSubjects, EmailTemplates } from './enums/notification.enum';
import { InAppNotificationsService } from './in-app/in-app-notifications.service';
import { CreateInAppNotificationDto } from './in-app/dto/create-in-app-notification.dto';
import { ClientSession } from 'mongoose';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly inAppNotificationsService: InAppNotificationsService,
  ) {}

  async createInAppNotification(
    dto: CreateInAppNotificationDto,
    session?: ClientSession,
  ): Promise<void> {
    try {
      await this.inAppNotificationsService.create(dto, session);
    } catch (error) {
      this.logger.error(
        `Failed to create in-app notification for user ${dto.userId}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

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
    transactionId?: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
    const transactionLink = transactionId
      ? `${frontendUrl}/wallet/transactions/${transactionId}`
      : undefined;

    await this.emailService.send(
      email,
      EmailSubjects.OUTBID,
      EmailTemplates.OUTBID,
      {
        name,
        auctionTitle,
        newAmount,
        auctionLink,
        transactionId,
        transactionLink,
      },
    );
  }

  async sendAuctionWonEmail(
    email: string,
    name: string,
    auctionTitle: string,
    winningAmount: number,
    auctionId: string,
    transactionId?: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
    const transactionLink = transactionId
      ? `${frontendUrl}/wallet/transactions/${transactionId}`
      : undefined;

    await this.emailService.send(
      email,
      EmailSubjects.AUCTION_WON,
      EmailTemplates.AUCTION_WON,
      {
        name,
        auctionTitle,
        winningAmount,
        auctionLink,
        transactionId,
        transactionLink,
      },
    );
  }

  async sendAuctionStartedSellerEmail(
    email: string,
    name: string,
    auctionTitle: string,
    auctionId: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;

    await this.emailService.send(
      email,
      EmailSubjects.AUCTION_STARTED_SELLER,
      EmailTemplates.AUCTION_STARTED_SELLER,
      { name, auctionTitle, auctionLink },
    );
  }

  async sendAuctionCancelledEmail(
    email: string,
    name: string,
    auctionTitle: string,
    auctionId: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;

    await this.emailService.send(
      email,
      EmailSubjects.AUCTION_CANCELLED,
      EmailTemplates.AUCTION_CANCELLED,
      { name, auctionTitle, auctionLink, role: 'seller' },
    );
  }

  async sendAuctionCancelledByAdminEmail(
    email: string,
    name: string,
    auctionTitle: string,
    auctionId: string,
    adminActionReason: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;

    await this.emailService.send(
      email,
      EmailSubjects.AUCTION_CANCELLED_BY_ADMIN,
      EmailTemplates.AUCTION_CANCELLED_BY_ADMIN, // Assuming the template handles both cases, or we can use the same
      { name, auctionTitle, auctionLink, adminActionReason, role: 'seller' },
    );
  }

  async sendAuctionCancelledToBidderEmail(
    email: string,
    name: string,
    auctionTitle: string,
    auctionId: string,
    adminActionReason: string,
    refundAmount: number,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;

    await this.emailService.send(
      email,
      EmailSubjects.AUCTION_CANCELLED_BY_ADMIN,
      EmailTemplates.AUCTION_CANCELLED_BY_ADMIN,
      {
        name,
        auctionTitle,
        auctionLink,
        adminActionReason,
        refundAmount,
        role: 'bidder',
      },
    );
  }

  async sendAuctionEndedSellerEmail(
    email: string,
    name: string,
    auctionTitle: string,
    finalPrice: number,
    winnerName: string | null,
    auctionId: string,
    transactionId?: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
    const hasWinner = Boolean(winnerName);
    const transactionLink = transactionId
      ? `${frontendUrl}/wallet/transactions/${transactionId}`
      : undefined;

    await this.emailService.send(
      email,
      EmailSubjects.AUCTION_ENDED_SELLER,
      EmailTemplates.AUCTION_ENDED_SELLER,
      {
        name,
        auctionTitle,
        finalPrice,
        winnerName,
        hasWinner,
        auctionLink,
        transactionId,
        transactionLink,
      },
    );
  }

  async sendDepositSuccessfulEmail(
    email: string,
    name: string,
    amount: number,
    transactionId?: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const transactionLink = transactionId
      ? `${frontendUrl}/wallet/transactions/${transactionId}`
      : `${frontendUrl}/wallet`;

    await this.emailService.send(
      email,
      EmailSubjects.DEPOSIT_SUCCESSFUL,
      EmailTemplates.DEPOSIT_SUCCESSFUL,
      { name, amount, transactionId, transactionLink },
    );
  }

  async sendWithdrawalCompletedEmail(
    email: string,
    name: string,
    amount: number,
    transactionId?: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://mazadak.com';
    const transactionLink = transactionId
      ? `${frontendUrl}/wallet/transactions/${transactionId}`
      : `${frontendUrl}/wallet`;

    await this.emailService.send(
      email,
      EmailSubjects.WITHDRAWAL_COMPLETED,
      EmailTemplates.WITHDRAWAL_COMPLETED,
      { name, amount, transactionId, transactionLink },
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
