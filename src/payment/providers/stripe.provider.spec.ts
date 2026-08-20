import { Test, TestingModule } from '@nestjs/testing';
import { StripeProvider } from './stripe.provider';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../enums/payment-status.enum';
import { StripeWebhookEvent } from '../constants/webhook-event-constants';
import Stripe from 'stripe';

jest.mock('stripe');

describe('StripeProvider', () => {
  let provider: StripeProvider;
  let mockStripeInstance: {
    paymentIntents: {
      create: jest.Mock;
      retrieve: jest.Mock;
    };
    webhooks: {
      constructEvent: jest.Mock;
    };
    refunds: {
      create: jest.Mock;
    };
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return 'sk_live_test_key';
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test_secret';
      return '';
    }),
  };

  beforeEach(async () => {
    mockStripeInstance = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
    };

    (Stripe as unknown as jest.Mock).mockImplementation(
      () => mockStripeInstance,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<StripeProvider>(StripeProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create Stripe payment intent successfully', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_123',
      });

      const result = await provider.createPayment({
        amount: 5000,
        currency: 'EGP',
        idempotencyKey: 'idemp-123',
        metadata: { userId: 'u1', walletId: 'w1', transactionId: 't1' },
        email: 'u@example.com',
      });

      expect(result).toEqual({
        gatewayPaymentIntentId: 'pi_123',
        clientSecret: 'secret_123',
        paymentUrl: null,
      });
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        {
          amount: 5000,
          currency: 'egp',
          metadata: { userId: 'u1', walletId: 'w1', transactionId: 't1' },
          receipt_email: 'u@example.com',
        },
        {
          idempotencyKey: 'idemp-123',
        },
      );
    });

    it('should throw if stripe create fails', async () => {
      mockStripeInstance.paymentIntents.create.mockRejectedValue(
        new Error('Stripe API error'),
      );

      await expect(
        provider.createPayment({
          amount: 5000,
          currency: 'EGP',
          idempotencyKey: 'idemp-123',
          metadata: {},
        }),
      ).rejects.toThrow('Stripe API error');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true when constructEvent succeeds', () => {
      mockStripeInstance.webhooks.constructEvent.mockReturnValue({});

      const result = provider.verifyWebhookSignature(
        Buffer.from('body'),
        'sig_123',
      );

      expect(result).toBe(true);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        Buffer.from('body'),
        'sig_123',
        'whsec_test_secret',
      );
    });

    it('should return false when constructEvent throws', () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = provider.verifyWebhookSignature(
        Buffer.from('body'),
        'invalid_sig',
      );

      expect(result).toBe(false);
    });
  });

  describe('refund', () => {
    it('should create refund in Stripe', async () => {
      mockStripeInstance.refunds.create.mockResolvedValue({});

      await provider.refund({
        gatewayPaymentIntentId: 'pi_123',
        amount: 5000,
        currency: 'EGP',
        reason: 'requested_by_customer',
      });

      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 5000,
        reason: 'requested_by_customer',
      });
    });

    it('should throw if refund fails', async () => {
      mockStripeInstance.refunds.create.mockRejectedValue(
        new Error('Refund error'),
      );

      await expect(
        provider.refund({
          gatewayPaymentIntentId: 'pi_123',
          amount: 5000,
          currency: 'EGP',
        }),
      ).rejects.toThrow('Refund error');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return SUCCESS when payment intent status is succeeded', async () => {
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({
        status: 'succeeded',
        latest_charge: 'ch_123',
      });

      const result = await provider.getPaymentStatus('pi_123');

      expect(result).toEqual({
        status: PaymentStatus.SUCCESS,
        gatewayTransactionId: 'ch_123',
      });
    });

    it('should return FAILED when payment intent status is canceled', async () => {
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({
        status: 'canceled',
        latest_charge: { id: 'ch_obj_123' },
      });

      const result = await provider.getPaymentStatus('pi_123');

      expect(result).toEqual({
        status: PaymentStatus.FAILED,
        gatewayTransactionId: 'ch_obj_123',
      });
    });

    it('should return PENDING for processing status', async () => {
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({
        status: 'processing',
        latest_charge: null,
      });

      const result = await provider.getPaymentStatus('pi_123');

      expect(result).toEqual({
        status: PaymentStatus.PENDING,
        gatewayTransactionId: undefined,
      });
    });
  });

  describe('extractWebhookData', () => {
    it('should extract webhook data from Stripe payload', () => {
      const payload = {
        type: StripeWebhookEvent.PaymentIntentSucceeded,
        data: {
          object: {
            metadata: { transactionId: 'tx_123' },
            amount: 5000,
            currency: 'egp',
          },
        },
      };

      const result = provider.extractWebhookData(payload);

      expect(result).toEqual({
        transactionId: 'tx_123',
        isSuccess: true,
        amountMinorUnits: 5000,
        currency: 'EGP',
      });
    });
  });
});
