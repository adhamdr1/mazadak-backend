"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const email_service_1 = require("./email/email.service");
const notification_enum_1 = require("./enums/notification.enum");
const in_app_notifications_service_1 = require("./in-app/in-app-notifications.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    emailService;
    configService;
    inAppNotificationsService;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(emailService, configService, inAppNotificationsService) {
        this.emailService = emailService;
        this.configService = configService;
        this.inAppNotificationsService = inAppNotificationsService;
    }
    async createInAppNotification(dto, session) {
        try {
            await this.inAppNotificationsService.create(dto, session);
        }
        catch (error) {
            this.logger.error(`Failed to create in-app notification for user ${dto.userId}:`, error instanceof Error ? error.stack : String(error));
        }
    }
    async sendEmailVerification(email, token, name, phone) {
        const confirmLink = `${this.configService.getOrThrow('FRONTEND_URL')}/auth/confirm-email?token=${token}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.CONFIRM_EMAIL, notification_enum_1.EmailTemplates.CONFIRM_EMAIL, { confirmLink, name, email, phone });
    }
    async sendPasswordResetEmail(email, token, user, metadata) {
        const resetLink = `${this.configService.getOrThrow('FRONTEND_URL')}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
        const formattedTime = this.formatDate(metadata.time);
        await this.emailService.send(email, notification_enum_1.EmailSubjects.RESET_PASSWORD, notification_enum_1.EmailTemplates.RESET_PASSWORD, { resetLink, email, name, ...metadata, time: formattedTime });
    }
    async sendWelcomeEmail(email, name) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        await this.emailService.send(email, notification_enum_1.EmailSubjects.WELCOME, notification_enum_1.EmailTemplates.WELCOME, { name, frontendUrl });
    }
    async sendAccountReactivationEmail(email, token, name) {
        const confirmLink = `${this.configService.getOrThrow('FRONTEND_URL')}/auth/confirm-reactivation?token=${token}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.ACCOUNT_REACTIVATION, notification_enum_1.EmailTemplates.ACCOUNT_REACTIVATION, { confirmLink, name });
    }
    async sendAccountReactivatedEmail(email, name) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        await this.emailService.send(email, notification_enum_1.EmailSubjects.ACCOUNT_ACTIVATED, notification_enum_1.EmailTemplates.ACCOUNT_ACTIVATED, { name, frontendUrl });
    }
    async sendPasswordChangedEmail(email, name, date) {
        const formattedDate = this.formatDate(date);
        await this.emailService.send(email, notification_enum_1.EmailSubjects.PASSWORD_CHANGED, notification_enum_1.EmailTemplates.PASSWORD_CHANGED, { name, date: formattedDate });
    }
    async sendOutbidEmail(email, name, auctionTitle, newAmount, auctionId, transactionId) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
        const transactionLink = transactionId
            ? `${frontendUrl}/wallet/transactions/${transactionId}`
            : undefined;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.OUTBID, notification_enum_1.EmailTemplates.OUTBID, {
            name,
            auctionTitle,
            newAmount,
            auctionLink,
            transactionId,
            transactionLink,
        });
    }
    async sendAutoBidExhaustedEmail(email, name, auctionTitle, maxAmount, currentPrice, auctionId) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.AUTO_BID_EXHAUSTED, notification_enum_1.EmailTemplates.AUTO_BID_EXHAUSTED, {
            name,
            auctionTitle,
            maxAmount,
            currentPrice,
            auctionLink,
        });
    }
    async sendAuctionWonEmail(email, name, auctionTitle, winningAmount, auctionId, transactionId) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
        const transactionLink = transactionId
            ? `${frontendUrl}/wallet/transactions/${transactionId}`
            : undefined;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.AUCTION_WON, notification_enum_1.EmailTemplates.AUCTION_WON, {
            name,
            auctionTitle,
            winningAmount,
            auctionLink,
            transactionId,
            transactionLink,
        });
    }
    async sendAuctionStartedSellerEmail(email, name, auctionTitle, auctionId) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.AUCTION_STARTED_SELLER, notification_enum_1.EmailTemplates.AUCTION_STARTED_SELLER, { name, auctionTitle, auctionLink });
    }
    async sendAuctionCancelledEmail(email, name, auctionTitle, auctionId) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.AUCTION_CANCELLED, notification_enum_1.EmailTemplates.AUCTION_CANCELLED, { name, auctionTitle, auctionLink, role: 'seller' });
    }
    async sendAuctionCancelledByAdminEmail(email, name, auctionTitle, auctionId, adminActionReason) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.AUCTION_CANCELLED_BY_ADMIN, notification_enum_1.EmailTemplates.AUCTION_CANCELLED_BY_ADMIN, { name, auctionTitle, auctionLink, adminActionReason, role: 'seller' });
    }
    async sendAuctionCancelledToBidderEmail(email, name, auctionTitle, auctionId, adminActionReason, refundAmount) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.AUCTION_CANCELLED_BY_ADMIN, notification_enum_1.EmailTemplates.AUCTION_CANCELLED_BY_ADMIN, {
            name,
            auctionTitle,
            auctionLink,
            adminActionReason,
            refundAmount,
            role: 'bidder',
        });
    }
    async sendAuctionEndedSellerEmail(email, name, auctionTitle, finalPrice, winnerName, auctionId, transactionId) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const auctionLink = `${frontendUrl}/auctions/${auctionId}`;
        const hasWinner = Boolean(winnerName);
        const transactionLink = transactionId
            ? `${frontendUrl}/wallet/transactions/${transactionId}`
            : undefined;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.AUCTION_ENDED_SELLER, notification_enum_1.EmailTemplates.AUCTION_ENDED_SELLER, {
            name,
            auctionTitle,
            finalPrice,
            winnerName,
            hasWinner,
            auctionLink,
            transactionId,
            transactionLink,
        });
    }
    async sendDepositSuccessfulEmail(email, name, amount, transactionId) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const transactionLink = transactionId
            ? `${frontendUrl}/wallet/transactions/${transactionId}`
            : `${frontendUrl}/wallet`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.DEPOSIT_SUCCESSFUL, notification_enum_1.EmailTemplates.DEPOSIT_SUCCESSFUL, { name, amount, transactionId, transactionLink });
    }
    async sendWithdrawalRequestedEmail(email, name, data) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const withdrawalLink = `${frontendUrl}/wallet/withdrawals/${data.withdrawalId}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.WITHDRAWAL_REQUESTED, notification_enum_1.EmailTemplates.WITHDRAWAL_REQUESTED, {
            name,
            amount: data.amount,
            netAmount: data.netAmount,
            fee: data.fee,
            payoutMethod: data.payoutMethod,
            estimatedDelivery: data.estimatedDelivery,
            withdrawalLink,
        });
    }
    async sendWithdrawalCompletedEmail(email, name, amount, transactionId, details) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const transactionLink = transactionId
            ? `${frontendUrl}/wallet/transactions/${transactionId}`
            : `${frontendUrl}/wallet`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.WITHDRAWAL_COMPLETED, notification_enum_1.EmailTemplates.WITHDRAWAL_COMPLETED, {
            name,
            amount,
            netAmount: details?.netAmount,
            payoutMethod: details?.payoutMethod,
            adminReference: details?.adminReference,
            receiptUrl: details?.receiptUrl,
            transactionId,
            transactionLink,
        });
    }
    async sendWithdrawalRejectedEmail(email, name, data) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const walletLink = `${frontendUrl}/wallet`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.WITHDRAWAL_REJECTED, notification_enum_1.EmailTemplates.WITHDRAWAL_REJECTED, {
            name,
            amount: data.amount,
            rejectionReason: data.rejectionReason,
            walletLink,
        });
    }
    async sendDisputeOpenedEmail(email, name, disputeId, reason, auctionId) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const disputeLink = `${frontendUrl}/disputes/${disputeId}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.DISPUTE_OPENED, notification_enum_1.EmailTemplates.DISPUTE_OPENED, { name, disputeId, reason, disputeLink, auctionId });
    }
    async sendDisputeResolvedEmail(email, name, disputeId, decision, adminNotes) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://mazadak.com';
        const disputeLink = `${frontendUrl}/disputes/${disputeId}`;
        await this.emailService.send(email, notification_enum_1.EmailSubjects.DISPUTE_RESOLVED, notification_enum_1.EmailTemplates.DISPUTE_RESOLVED, { name, disputeId, decision, adminNotes, disputeLink });
    }
    formatDate(dateInput) {
        const date = dateInput ? new Date(dateInput) : new Date();
        const timeZone = this.configService.get('APP_TIMEZONE') || 'Africa/Cairo';
        return (date.toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone,
        }) + ' (Cairo Time)');
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        config_1.ConfigService,
        in_app_notifications_service_1.InAppNotificationsService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map