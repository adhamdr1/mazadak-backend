import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { TransactionService } from '../transaction/transaction.service';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { WalletService } from '../wallet/wallet.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaymentProviderType } from './enums/payment-provider-type.enum';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { TransactionReferenceType } from '../transaction/enums/transaction-reference-type.enum';
import { WebhookSignatureVerificationFailedException } from './exceptions/webhook-signature-verification-failed.exception';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { WebhookEvent } from './entities/webhook-event.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Transaction } from '../transaction/entities/transaction.entity';

const mockWebhookEventRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockProvider = {
  verifyWebhookSignature: jest.fn(),
  extractWebhookData: jest.fn(),
  createPayment: jest.fn(),
};

const mockProviderFactory = {
  getProvider: jest.fn().mockReturnValue(mockProvider),
};

const mockTransactionService = {
  createTransaction: jest.fn(),
  updateTransactionStatusAndEmitOutbox: jest.fn(),
  updateGatewayPaymentIntentId: jest.fn(),
};

const mockOutboxService = {
  saveEvent: jest.fn(),
};

const mockWalletService = {
  getWalletByUserId: jest.fn(),
};

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockConnection = {
  startSession: jest.fn().mockResolvedValue(mockSession),
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: 'IWebhookEventRepository',
          useValue: mockWebhookEventRepository,
        },
        {
          provide: PaymentProviderFactory,
          useValue: mockProviderFactory,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const userId = new Types.ObjectId().toString();
  const walletId = new Types.ObjectId().toString();
  const transactionId = new Types.ObjectId().toString();
  const providerEventId = 'evt_123456';
  const rawBody = Buffer.from('{"test": true}');
  const signature = 'valid_signature';
  const payload: Record<string, unknown> = { id: providerEventId };

  const currentUser: JwtPayload = {
    sub: userId,
    email: 'user@example.com',
    role: UserRole.USER,
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockWallet: Wallet = {
    _id: new Types.ObjectId(walletId),
    userId: new Types.ObjectId(userId),
    balance: Types.Decimal128.fromString('100.00'),
    heldBalance: Types.Decimal128.fromString('0.00'),
    availableBalance: '100.00',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction: Transaction = {
    _id: new Types.ObjectId(transactionId),
    walletId: new Types.ObjectId(walletId),
    type: TransactionType.DEPOSIT,
    amount: Types.Decimal128.fromString('50.00'),
    currency: 'EGP',
    status: TransactionStatus.PENDING,
    referenceId: null,
    referenceType: null,
    idempotencyKey: null,
    gatewayProvider: null,
    gatewayPaymentIntentId: null,
    gatewayTransactionId: null,
    hasChild: false,
    walletCredited: false,
    expiresAt: null,
    createdAt: new Date(),
  };

  describe('handleWebhook', () => {
    it('should throw WebhookSignatureVerificationFailedException if signature is invalid', async () => {
      mockProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(
          PaymentProviderType.STRIPE,
          rawBody,
          'invalid_sig',
          providerEventId,
          payload,
        ),
      ).rejects.toThrow(WebhookSignatureVerificationFailedException);

      expect(mockWebhookEventRepository.create).not.toHaveBeenCalled();
    });

    it('should skip processing if event already exists (idempotency)', async () => {
      mockProvider.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookEventRepository.findOne.mockResolvedValue({
        providerEventId,
      });

      await service.handleWebhook(
        PaymentProviderType.STRIPE,
        rawBody,
        signature,
        providerEventId,
        payload,
      );

      expect(mockWebhookEventRepository.create).not.toHaveBeenCalled();
      expect(mockOutboxService.saveEvent).not.toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should save webhook event to inbox and outbox if valid and new', async () => {
      mockProvider.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookEventRepository.findOne.mockResolvedValue(null);
      mockWebhookEventRepository.create.mockResolvedValue({});
      mockOutboxService.saveEvent.mockResolvedValue(undefined);

      await service.handleWebhook(
        PaymentProviderType.STRIPE,
        rawBody,
        signature,
        providerEventId,
        payload,
      );

      expect(mockWebhookEventRepository.create).toHaveBeenCalledWith(
        {
          providerEventId,
          provider: PaymentProviderType.STRIPE,
          payload,
          providerSignature: signature,
          processed: false,
        },
        mockSession,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledWith(
        RabbitMQEvent.PaymentWebhookReceived,
        {
          providerEventId,
          provider: PaymentProviderType.STRIPE,
          payload,
        },
        mockSession,
        providerEventId,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should abort transaction and throw if an error occurs', async () => {
      mockProvider.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookEventRepository.findOne.mockRejectedValue(
        new Error('DB Error'),
      );

      await expect(
        service.handleWebhook(
          PaymentProviderType.STRIPE,
          rawBody,
          signature,
          providerEventId,
          payload,
        ),
      ).rejects.toThrow('DB Error');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe('processPaymentWebhookEvent', () => {
    const eventPayload = {
      providerEventId,
      provider: PaymentProviderType.STRIPE,
      payload,
    };

    it('should return early if webhook event is not found in DB', async () => {
      mockWebhookEventRepository.findOne.mockResolvedValue(null);

      await service.processPaymentWebhookEvent(eventPayload);

      expect(mockProvider.extractWebhookData).not.toHaveBeenCalled();
    });

    it('should return early if webhook event is already processed', async () => {
      mockWebhookEventRepository.findOne.mockResolvedValue({
        providerEventId,
        processed: true,
      });

      await service.processPaymentWebhookEvent(eventPayload);

      expect(mockProvider.extractWebhookData).not.toHaveBeenCalled();
    });

    it('should process successful webhook event and update transaction', async () => {
      const webhookEvent: WebhookEvent = {
        providerEventId,
        provider: PaymentProviderType.STRIPE,
        payload,
        providerSignature: signature,
        processed: false,
        processedAt: null,
        retryCount: 0,
        errorMessage: null,
        receivedAt: new Date(),
      };

      mockWebhookEventRepository.findOne.mockResolvedValue(webhookEvent);
      mockProvider.extractWebhookData.mockReturnValue({
        transactionId,
        isSuccess: true,
        amountMinorUnits: 5000,
        currency: 'EGP',
      });
      mockTransactionService.updateTransactionStatusAndEmitOutbox.mockResolvedValue(
        undefined,
      );
      mockWebhookEventRepository.save.mockResolvedValue(undefined);

      await service.processPaymentWebhookEvent(eventPayload);

      expect(
        mockTransactionService.updateTransactionStatusAndEmitOutbox,
      ).toHaveBeenCalledWith(
        transactionId,
        TransactionStatus.SUCCESS,
        5000,
        'EGP',
        mockSession,
      );
      expect(webhookEvent.processed).toBe(true);
      expect(mockWebhookEventRepository.save).toHaveBeenCalledWith(
        webhookEvent,
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should process failed webhook event and update transaction status to FAILED', async () => {
      const webhookEvent: WebhookEvent = {
        providerEventId,
        provider: PaymentProviderType.STRIPE,
        payload,
        providerSignature: signature,
        processed: false,
        processedAt: null,
        retryCount: 0,
        errorMessage: null,
        receivedAt: new Date(),
      };

      mockWebhookEventRepository.findOne.mockResolvedValue(webhookEvent);
      mockProvider.extractWebhookData.mockReturnValue({
        transactionId,
        isSuccess: false,
        amountMinorUnits: 5000,
        currency: 'EGP',
      });
      mockTransactionService.updateTransactionStatusAndEmitOutbox.mockResolvedValue(
        undefined,
      );
      mockWebhookEventRepository.save.mockResolvedValue(undefined);

      await service.processPaymentWebhookEvent(eventPayload);

      expect(
        mockTransactionService.updateTransactionStatusAndEmitOutbox,
      ).toHaveBeenCalledWith(
        transactionId,
        TransactionStatus.FAILED,
        5000,
        'EGP',
        mockSession,
      );
      expect(webhookEvent.processed).toBe(true);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should handle unsupported currency without updating transaction', async () => {
      const webhookEvent: WebhookEvent = {
        providerEventId,
        provider: PaymentProviderType.STRIPE,
        payload,
        providerSignature: signature,
        processed: false,
        processedAt: null,
        retryCount: 0,
        errorMessage: null,
        receivedAt: new Date(),
      };

      mockWebhookEventRepository.findOne.mockResolvedValue(webhookEvent);
      mockProvider.extractWebhookData.mockReturnValue({
        transactionId,
        isSuccess: true,
        amountMinorUnits: 5000,
        currency: 'USD',
      });

      await service.processPaymentWebhookEvent(eventPayload);

      expect(
        mockTransactionService.updateTransactionStatusAndEmitOutbox,
      ).not.toHaveBeenCalled();
      expect(webhookEvent.processed).toBe(true);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should increment retryCount and update errorMessage on error', async () => {
      const webhookEvent: WebhookEvent = {
        providerEventId,
        provider: PaymentProviderType.STRIPE,
        payload,
        providerSignature: signature,
        processed: false,
        processedAt: null,
        retryCount: 0,
        errorMessage: null,
        receivedAt: new Date(),
      };

      mockWebhookEventRepository.findOne
        .mockResolvedValueOnce(webhookEvent)
        .mockResolvedValueOnce(webhookEvent);
      mockProvider.extractWebhookData.mockImplementation(() => {
        throw new Error('Extraction error');
      });

      await expect(
        service.processPaymentWebhookEvent(eventPayload),
      ).rejects.toThrow('Extraction error');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(webhookEvent.retryCount).toBe(1);
      expect(webhookEvent.errorMessage).toBe('Extraction error');
      expect(mockWebhookEventRepository.save).toHaveBeenCalledWith(
        webhookEvent,
      );
    });
  });

  describe('initializePayment', () => {
    const initDto: InitializePaymentDto = {
      provider: PaymentProviderType.STRIPE,
      amount: 5000, // 50.00 EGP
      currency: 'EGP',
    };

    it('should initialize payment successfully', async () => {
      mockWalletService.getWalletByUserId.mockResolvedValue(mockWallet);
      mockTransactionService.createTransaction.mockResolvedValue(
        mockTransaction,
      );
      mockProvider.createPayment.mockResolvedValue({
        gatewayPaymentIntentId: 'pi_123',
        clientSecret: 'secret_123',
        paymentUrl: 'https://pay.stripe.com/123',
      });
      mockTransactionService.updateGatewayPaymentIntentId.mockResolvedValue(
        undefined,
      );

      const result = await service.initializePayment(currentUser, initDto);

      expect(result).toMatchObject({
        gatewayPaymentIntentId: 'pi_123',
        clientSecret: 'secret_123',
        paymentUrl: 'https://pay.stripe.com/123',
      });
      expect(result.idempotencyKey).toBeDefined();
      expect(mockWalletService.getWalletByUserId).toHaveBeenCalledWith(userId);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId,
          type: TransactionType.DEPOSIT,
          amount: 50,
          currency: 'EGP',
          status: TransactionStatus.PENDING,
        }),
      );
      expect(mockProvider.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          currency: 'EGP',
          email: currentUser.email,
        }),
      );
      expect(
        mockTransactionService.updateGatewayPaymentIntentId,
      ).toHaveBeenCalledWith(transactionId, 'pi_123');
    });

    it('should record FAILED transaction and re-throw if provider fails', async () => {
      mockWalletService.getWalletByUserId.mockResolvedValue(mockWallet);
      mockTransactionService.createTransaction
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce({});
      mockProvider.createPayment.mockRejectedValue(new Error('Gateway error'));

      await expect(
        service.initializePayment(currentUser, initDto),
      ).rejects.toThrow('Gateway error');

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          walletId,
          type: TransactionType.DEPOSIT,
          amount: 50,
          status: TransactionStatus.FAILED,
          referenceId: transactionId,
          referenceType: TransactionReferenceType.TRANSACTION,
        }),
      );
    });
  });
});
