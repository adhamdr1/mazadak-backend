import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { ConfigService } from '@nestjs/config';
import { InAppNotificationsService } from './in-app/in-app-notifications.service';
import { EmailSubjects, EmailTemplates } from './enums/notification.enum';
import { InAppNotificationType } from './in-app/enums/in-app-notification-type.enum';

const mockEmailService = {
  send: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'FRONTEND_URL') return 'https://mazadak.com';
    return '';
  }),
  get: jest.fn((key: string) => {
    if (key === 'FRONTEND_URL') return 'https://mazadak.com';
    if (key === 'APP_TIMEZONE') return 'Africa/Cairo';
    return undefined;
  }),
};

const mockInAppNotificationsService = {
  create: jest.fn().mockResolvedValue(undefined),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: InAppNotificationsService,
          useValue: mockInAppNotificationsService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInAppNotification', () => {
    it('should call inAppNotificationsService.create', async () => {
      const dto = {
        userId: 'u1',
        title: 'Title',
        body: 'Message body',
        type: InAppNotificationType.AUCTION_WON,
      };

      await service.createInAppNotification(dto);

      expect(mockInAppNotificationsService.create).toHaveBeenCalledWith(
        dto,
        undefined,
      );
    });

    it('should catch and log error if creation fails', async () => {
      mockInAppNotificationsService.create.mockRejectedValue(
        new Error('DB error'),
      );

      const dto = {
        userId: 'u1',
        title: 'Title',
        body: 'Message body',
        type: InAppNotificationType.AUCTION_WON,
      };

      await expect(service.createInAppNotification(dto)).resolves.not.toThrow();
    });
  });

  describe('Email notifications', () => {
    it('sendEmailVerification', async () => {
      await service.sendEmailVerification(
        'u@example.com',
        'tok-123',
        'John',
        '+201000',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.CONFIRM_EMAIL,
        EmailTemplates.CONFIRM_EMAIL,
        expect.objectContaining({
          confirmLink: 'https://mazadak.com/auth/confirm-email?token=tok-123',
          name: 'John',
        }),
      );
    });

    it('sendPasswordResetEmail', async () => {
      await service.sendPasswordResetEmail(
        'u@example.com',
        'tok-123',
        { firstName: 'John', lastName: 'Doe' },
        { ip: '127.0.0.1', browser: 'Chrome', time: '2026-08-20T00:00:00Z' },
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.RESET_PASSWORD,
        EmailTemplates.RESET_PASSWORD,
        expect.objectContaining({
          name: 'John Doe',
          ip: '127.0.0.1',
        }),
      );
    });

    it('sendWelcomeEmail', async () => {
      await service.sendWelcomeEmail('u@example.com', 'John');

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.WELCOME,
        EmailTemplates.WELCOME,
        expect.objectContaining({ name: 'John' }),
      );
    });

    it('sendAccountReactivationEmail', async () => {
      await service.sendAccountReactivationEmail(
        'u@example.com',
        'tok-123',
        'John',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.ACCOUNT_REACTIVATION,
        EmailTemplates.ACCOUNT_REACTIVATION,
        expect.objectContaining({ name: 'John' }),
      );
    });

    it('sendAccountReactivatedEmail', async () => {
      await service.sendAccountReactivatedEmail('u@example.com', 'John');

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.ACCOUNT_ACTIVATED,
        EmailTemplates.ACCOUNT_ACTIVATED,
        expect.objectContaining({ name: 'John' }),
      );
    });

    it('sendPasswordChangedEmail', async () => {
      await service.sendPasswordChangedEmail('u@example.com', 'John');

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.PASSWORD_CHANGED,
        EmailTemplates.PASSWORD_CHANGED,
        expect.objectContaining({ name: 'John' }),
      );
    });

    it('sendOutbidEmail', async () => {
      await service.sendOutbidEmail(
        'u@example.com',
        'John',
        'Vintage Watch',
        250,
        'auc-1',
        'tx-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.OUTBID,
        EmailTemplates.OUTBID,
        expect.objectContaining({
          name: 'John',
          auctionTitle: 'Vintage Watch',
          newAmount: 250,
        }),
      );
    });

    it('sendAutoBidExhaustedEmail', async () => {
      await service.sendAutoBidExhaustedEmail(
        'u@example.com',
        'John',
        'Vintage Watch',
        500,
        550,
        'auc-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.AUTO_BID_EXHAUSTED,
        EmailTemplates.AUTO_BID_EXHAUSTED,
        expect.objectContaining({
          name: 'John',
          maxAmount: 500,
          currentPrice: 550,
        }),
      );
    });

    it('sendAuctionWonEmail', async () => {
      await service.sendAuctionWonEmail(
        'u@example.com',
        'John',
        'Vintage Watch',
        1000,
        'auc-1',
        'tx-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.AUCTION_WON,
        EmailTemplates.AUCTION_WON,
        expect.objectContaining({
          name: 'John',
          winningAmount: 1000,
        }),
      );
    });

    it('sendAuctionStartedSellerEmail', async () => {
      await service.sendAuctionStartedSellerEmail(
        'u@example.com',
        'John',
        'Vintage Watch',
        'auc-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.AUCTION_STARTED_SELLER,
        EmailTemplates.AUCTION_STARTED_SELLER,
        expect.objectContaining({ name: 'John' }),
      );
    });

    it('sendAuctionCancelledEmail', async () => {
      await service.sendAuctionCancelledEmail(
        'u@example.com',
        'John',
        'Vintage Watch',
        'auc-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.AUCTION_CANCELLED,
        EmailTemplates.AUCTION_CANCELLED,
        expect.objectContaining({ name: 'John', role: 'seller' }),
      );
    });

    it('sendAuctionCancelledByAdminEmail', async () => {
      await service.sendAuctionCancelledByAdminEmail(
        'u@example.com',
        'John',
        'Vintage Watch',
        'auc-1',
        'Policy violation',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.AUCTION_CANCELLED_BY_ADMIN,
        EmailTemplates.AUCTION_CANCELLED_BY_ADMIN,
        expect.objectContaining({ adminActionReason: 'Policy violation' }),
      );
    });

    it('sendAuctionCancelledToBidderEmail', async () => {
      await service.sendAuctionCancelledToBidderEmail(
        'u@example.com',
        'John',
        'Vintage Watch',
        'auc-1',
        'Policy violation',
        500,
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.AUCTION_CANCELLED_BY_ADMIN,
        EmailTemplates.AUCTION_CANCELLED_BY_ADMIN,
        expect.objectContaining({ refundAmount: 500, role: 'bidder' }),
      );
    });

    it('sendAuctionEndedSellerEmail', async () => {
      await service.sendAuctionEndedSellerEmail(
        'u@example.com',
        'John',
        'Vintage Watch',
        1000,
        'Buyer 1',
        'auc-1',
        'tx-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.AUCTION_ENDED_SELLER,
        EmailTemplates.AUCTION_ENDED_SELLER,
        expect.objectContaining({ hasWinner: true, winnerName: 'Buyer 1' }),
      );
    });

    it('sendDepositSuccessfulEmail', async () => {
      await service.sendDepositSuccessfulEmail(
        'u@example.com',
        'John',
        1000,
        'tx-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.DEPOSIT_SUCCESSFUL,
        EmailTemplates.DEPOSIT_SUCCESSFUL,
        expect.objectContaining({ amount: 1000 }),
      );
    });

    it('sendWithdrawalCompletedEmail', async () => {
      await service.sendWithdrawalCompletedEmail(
        'u@example.com',
        'John',
        1000,
        'tx-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.WITHDRAWAL_COMPLETED,
        EmailTemplates.WITHDRAWAL_COMPLETED,
        expect.objectContaining({ amount: 1000 }),
      );
    });

    it('sendDisputeOpenedEmail', async () => {
      await service.sendDisputeOpenedEmail(
        'u@example.com',
        'John',
        'disp-1',
        'Item damaged',
        'auc-1',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.DISPUTE_OPENED,
        EmailTemplates.DISPUTE_OPENED,
        expect.objectContaining({ reason: 'Item damaged' }),
      );
    });

    it('sendDisputeResolvedEmail', async () => {
      await service.sendDisputeResolvedEmail(
        'u@example.com',
        'John',
        'disp-1',
        'REFUND_BUYER',
        'Refund approved',
      );

      expect(mockEmailService.send).toHaveBeenCalledWith(
        'u@example.com',
        EmailSubjects.DISPUTE_RESOLVED,
        EmailTemplates.DISPUTE_RESOLVED,
        expect.objectContaining({ decision: 'REFUND_BUYER' }),
      );
    });
  });
});
