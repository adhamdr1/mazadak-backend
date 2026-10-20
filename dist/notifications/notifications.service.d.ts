import { ConfigService } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { InAppNotificationsService } from './in-app/in-app-notifications.service';
import { CreateInAppNotificationDto } from './in-app/dto/create-in-app-notification.dto';
import { ClientSession } from 'mongoose';
export declare class NotificationsService {
    private readonly emailService;
    private readonly configService;
    private readonly inAppNotificationsService;
    private readonly logger;
    constructor(emailService: EmailService, configService: ConfigService, inAppNotificationsService: InAppNotificationsService);
    createInAppNotification(dto: CreateInAppNotificationDto, session?: ClientSession): Promise<void>;
    sendEmailVerification(email: string, token: string, name: string, phone: string): Promise<void>;
    sendPasswordResetEmail(email: string, token: string, user: {
        firstName?: string;
        lastName?: string;
    }, metadata: {
        ip: string;
        browser: string;
        time: string;
    }): Promise<void>;
    sendWelcomeEmail(email: string, name: string): Promise<void>;
    sendAccountReactivationEmail(email: string, token: string, name: string): Promise<void>;
    sendAccountReactivatedEmail(email: string, name: string): Promise<void>;
    sendPasswordChangedEmail(email: string, name: string, date?: Date | string): Promise<void>;
    sendOutbidEmail(email: string, name: string, auctionTitle: string, newAmount: number, auctionId: string, transactionId?: string): Promise<void>;
    sendAutoBidExhaustedEmail(email: string, name: string, auctionTitle: string, maxAmount: number, currentPrice: number, auctionId: string): Promise<void>;
    sendAuctionWonEmail(email: string, name: string, auctionTitle: string, winningAmount: number, auctionId: string, transactionId?: string): Promise<void>;
    sendAuctionStartedSellerEmail(email: string, name: string, auctionTitle: string, auctionId: string): Promise<void>;
    sendAuctionCancelledEmail(email: string, name: string, auctionTitle: string, auctionId: string): Promise<void>;
    sendAuctionCancelledByAdminEmail(email: string, name: string, auctionTitle: string, auctionId: string, adminActionReason: string): Promise<void>;
    sendAuctionCancelledToBidderEmail(email: string, name: string, auctionTitle: string, auctionId: string, adminActionReason: string, refundAmount: number): Promise<void>;
    sendAuctionEndedSellerEmail(email: string, name: string, auctionTitle: string, finalPrice: number, winnerName: string | null, auctionId: string, transactionId?: string): Promise<void>;
    sendDepositSuccessfulEmail(email: string, name: string, amount: number, transactionId?: string): Promise<void>;
    sendWithdrawalRequestedEmail(email: string, name: string, data: {
        amount: number;
        netAmount: number;
        fee: number;
        payoutMethod: string;
        estimatedDelivery?: string;
        withdrawalId: string;
    }): Promise<void>;
    sendWithdrawalCompletedEmail(email: string, name: string, amount: number, transactionId?: string, details?: {
        netAmount?: number;
        payoutMethod?: string;
        adminReference?: string;
        receiptUrl?: string;
        withdrawalId?: string;
    }): Promise<void>;
    sendWithdrawalRejectedEmail(email: string, name: string, data: {
        amount: number;
        rejectionReason: string;
        withdrawalId: string;
    }): Promise<void>;
    sendDisputeOpenedEmail(email: string, name: string, disputeId: string, reason: string, auctionId?: string): Promise<void>;
    sendDisputeResolvedEmail(email: string, name: string, disputeId: string, decision: string, adminNotes?: string): Promise<void>;
    formatDate(dateInput?: Date | string): string;
}
