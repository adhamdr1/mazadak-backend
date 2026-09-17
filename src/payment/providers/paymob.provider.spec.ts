import { Test, TestingModule } from '@nestjs/testing';
import { PaymobProvider } from './paymob.provider';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../enums/payment-status.enum';
import axios from 'axios';
import * as crypto from 'crypto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaymobProvider', () => {
  let provider: PaymobProvider;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'PAYMOB_SECRET_KEY') return 'test_secret_key';
      if (key === 'PAYMOB_PUBLIC_KEY') return 'test_public_key';
      if (key === 'PAYMOB_API_KEY') return 'test_api_key';
      if (key === 'PAYMOB_HMAC_SECRET') return 'test_hmac_secret';
      if (key === 'PAYMOB_INTEGRATION_IDS') return '5920300,5920296,5920302';
      if (key === 'PAYMOB_API_BASE_URL') return 'https://accept.paymob.com';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymobProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<PaymobProvider>(PaymobProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create payment intention through modern Paymob API', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          client_secret: 'cs_test_12345',
          id: 67890,
          intention_order_id: 998877,
        },
      });

      const result = await provider.createPayment({
        amount: 5000,
        currency: 'EGP',
        idempotencyKey: 'idemp-123',
        metadata: { transactionId: 'tx_123' },
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toEqual({
        gatewayPaymentIntentId: '67890',
        clientSecret: 'cs_test_12345',
        paymentUrl:
          'https://accept.paymob.com/unifiedcheckout/?publicKey=test_public_key&clientSecret=cs_test_12345',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accept.paymob.com/v1/intention/',
        expect.objectContaining({
          amount: 5000,
          currency: 'EGP',
          payment_methods: [5920300, 5920296, 5920302],
          special_reference: 'tx_123',
        }),
        expect.objectContaining({
          headers: {
            Authorization: 'Token test_secret_key',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should throw InternalServerErrorException if Intention creation fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(
        new Error('Paymob connection timeout'),
      );

      await expect(
        provider.createPayment({
          amount: 5000,
          currency: 'EGP',
          idempotencyKey: 'idemp-123',
          metadata: {},
        }),
      ).rejects.toThrow('Payment creation failed');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid HMAC signature', () => {
      const obj = {
        amount_cents: 5000,
        created_at: '2026-08-20T00:00:00',
        currency: 'EGP',
        error_occured: false,
        has_parent_transaction: false,
        id: 11111,
        integration_id: 5920300,
        is_3d_secure: true,
        is_auth: false,
        is_capture: false,
        is_refunded: false,
        is_standalone_payment: true,
        is_voided: false,
        order: { id: 22222 },
        owner: 33333,
        pending: false,
        source_data: { pan: '2345', sub_type: 'MasterCard', type: 'card' },
        success: true,
      };

      const concatenated = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order.id,
        obj.owner,
        obj.pending,
        obj.source_data.pan,
        obj.source_data.sub_type,
        obj.source_data.type,
        obj.success,
      ].join('');

      const validSignature = crypto
        .createHmac('sha512', 'test_hmac_secret')
        .update(concatenated)
        .digest('hex');

      const rawBody = Buffer.from(JSON.stringify({ obj }));

      const isValid = provider.verifyWebhookSignature(rawBody, validSignature);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid HMAC signature', () => {
      const rawBody = Buffer.from(JSON.stringify({ obj: { id: 123 } }));

      const isValid = provider.verifyWebhookSignature(rawBody, 'invalid_hmac');

      expect(isValid).toBe(false);
    });

    it('should return false if signature is empty', () => {
      const rawBody = Buffer.from(JSON.stringify({ obj: { id: 123 } }));

      const isValid = provider.verifyWebhookSignature(rawBody, '');

      expect(isValid).toBe(false);
    });

    it('should return false if payload is malformed', () => {
      const rawBody = Buffer.from('invalid-json');

      const isValid = provider.verifyWebhookSignature(rawBody, 'any_hmac');

      expect(isValid).toBe(false);
    });
  });

  describe('refund', () => {
    it('should call refund API', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { token: 'auth_token_123' } })
        .mockResolvedValueOnce({ data: {} });

      await provider.refund({
        gatewayPaymentIntentId: '12345',
        amount: 5000,
        currency: 'EGP',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accept.paymob.com/api/acceptance/void_refund/refund',
        {
          auth_token: 'auth_token_123',
          transaction_id: 12345,
          amount_cents: 5000,
        },
        { timeout: 10000 },
      );
    });
  });

  describe('getPaymentStatus', () => {
    it('should return SUCCESS when paid_amount_cents > 0', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { token: 'auth_token_123' },
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: { paid_amount_cents: 5000, is_voided: false },
      });

      const result = await provider.getPaymentStatus('order_123');

      expect(result).toEqual({
        status: PaymentStatus.SUCCESS,
        gatewayTransactionId: 'order_123',
      });
    });

    it('should return FAILED when is_voided is true', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { token: 'auth_token_123' },
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: { paid_amount_cents: 0, is_voided: true },
      });

      const result = await provider.getPaymentStatus('order_123');

      expect(result).toEqual({
        status: PaymentStatus.FAILED,
        gatewayTransactionId: 'order_123',
      });
    });

    it('should return PENDING when not paid and not voided', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { token: 'auth_token_123' },
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: { paid_amount_cents: 0, is_voided: false },
      });

      const result = await provider.getPaymentStatus('order_123');

      expect(result).toEqual({
        status: PaymentStatus.PENDING,
        gatewayTransactionId: 'order_123',
      });
    });
  });

  describe('extractWebhookData', () => {
    it('should extract data using special_reference', () => {
      const payload = {
        obj: {
          special_reference: 'tx_special_123',
          success: true,
          pending: false,
          is_voided: false,
          is_refunded: false,
          error_occured: false,
          amount_cents: 5000,
          currency: 'egp',
        },
      };

      const result = provider.extractWebhookData(payload);

      expect(result).toEqual({
        transactionId: 'tx_special_123',
        isSuccess: true,
        amountMinorUnits: 5000,
        currency: 'EGP',
      });
    });

    it('should extract data using merchant_order_id fallback', () => {
      const payload = {
        obj: {
          order: { merchant_order_id: 'tx_999' },
          success: true,
          pending: false,
          amount_cents: 5000,
          currency: 'EGP',
        },
      };

      const result = provider.extractWebhookData(payload);

      expect(result).toEqual({
        transactionId: 'tx_999',
        isSuccess: true,
        amountMinorUnits: 5000,
        currency: 'EGP',
      });
    });

    it('should NOT treat pending transactions as success (Zero False-Credit Rule)', () => {
      const payload = {
        obj: {
          special_reference: 'tx_pending_123',
          success: true,
          pending: true, // e.g. Wallet cash awaiting user pin
          amount_cents: 5000,
          currency: 'EGP',
        },
      };

      const result = provider.extractWebhookData(payload);

      expect(result.isSuccess).toBe(false);
    });

    it('should NOT treat voided or refunded transactions as success', () => {
      const payload = {
        obj: {
          special_reference: 'tx_voided_123',
          success: true,
          pending: false,
          is_voided: true,
          amount_cents: 5000,
          currency: 'EGP',
        },
      };

      const result = provider.extractWebhookData(payload);

      expect(result.isSuccess).toBe(false);
    });
  });
});
