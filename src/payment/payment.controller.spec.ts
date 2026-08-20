import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentProviderType } from './enums/payment-provider-type.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { MissingSignatureHeaderException } from './exceptions/missing-signature-header.exception';
import { MissingRawBodyException } from './exceptions/missing-raw-body.exception';
import { MissingEventIdException } from './exceptions/missing-event-id.exception';
import { MissingHmacSignatureException } from './exceptions/missing-hmac-signature.exception';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

const mockPaymentService = {
  initializePayment: jest.fn(),
  handleWebhook: jest.fn(),
};

describe('PaymentController', () => {
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const currentUser: JwtPayload = {
    sub: 'user-123',
    email: 'user@example.com',
    role: UserRole.USER,
  };

  describe('initializePayment', () => {
    it('should initialize payment through PaymentService', async () => {
      const dto: InitializePaymentDto = {
        provider: PaymentProviderType.STRIPE,
        amount: 5000,
        currency: 'EGP',
      };
      const expectedResult = {
        gatewayPaymentIntentId: 'pi_123',
        clientSecret: 'secret_123',
        paymentUrl: 'https://pay.stripe.com/123',
        idempotencyKey: 'idemp-123',
      };

      mockPaymentService.initializePayment.mockResolvedValue(expectedResult);

      const result = await controller.initializePayment(currentUser, dto);

      expect(result).toEqual(expectedResult);
      expect(mockPaymentService.initializePayment).toHaveBeenCalledWith(
        currentUser,
        dto,
      );
    });
  });

  describe('handleStripeWebhook', () => {
    const rawBody = Buffer.from('{"id": "evt_stripe_123"}');
    const signature = 'stripe_sig_123';

    it('should throw MissingSignatureHeaderException if signature is missing', async () => {
      const req = {
        rawBody,
        body: { id: 'evt_stripe_123' },
      } as unknown as RawBodyRequest<Request>;

      await expect(controller.handleStripeWebhook(req, '')).rejects.toThrow(
        MissingSignatureHeaderException,
      );
    });

    it('should throw MissingRawBodyException if rawBody is missing', async () => {
      const req = {
        body: { id: 'evt_stripe_123' },
      } as unknown as RawBodyRequest<Request>;

      await expect(
        controller.handleStripeWebhook(req, signature),
      ).rejects.toThrow(MissingRawBodyException);
    });

    it('should throw MissingEventIdException if event ID is missing in payload', async () => {
      const req = { rawBody, body: {} } as unknown as RawBodyRequest<Request>;

      await expect(
        controller.handleStripeWebhook(req, signature),
      ).rejects.toThrow(MissingEventIdException);
    });

    it('should handle stripe webhook successfully', async () => {
      const payload = { id: 'evt_stripe_123' };
      const req = {
        rawBody,
        body: payload,
      } as unknown as RawBodyRequest<Request>;

      mockPaymentService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handleStripeWebhook(req, signature);

      expect(result).toEqual({ received: true });
      expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(
        PaymentProviderType.STRIPE,
        rawBody,
        signature,
        'evt_stripe_123',
        payload,
      );
    });
  });

  describe('handlePaymobWebhook', () => {
    const rawBody = Buffer.from('{"obj": {"id": 12345}}');
    const querySignature = 'paymob_hmac_123';

    it('should throw MissingHmacSignatureException if query hmac is missing', async () => {
      const req = {
        rawBody,
        body: { obj: { id: 12345 } },
      } as unknown as RawBodyRequest<Request>;

      await expect(controller.handlePaymobWebhook(req, '')).rejects.toThrow(
        MissingHmacSignatureException,
      );
    });

    it('should throw MissingRawBodyException if rawBody is missing', async () => {
      const req = {
        body: { obj: { id: 12345 } },
      } as unknown as RawBodyRequest<Request>;

      await expect(
        controller.handlePaymobWebhook(req, querySignature),
      ).rejects.toThrow(MissingRawBodyException);
    });

    it('should throw MissingEventIdException if event ID is missing in payload', async () => {
      const req = { rawBody, body: {} } as unknown as RawBodyRequest<Request>;

      await expect(
        controller.handlePaymobWebhook(req, querySignature),
      ).rejects.toThrow(MissingEventIdException);
    });

    it('should handle paymob webhook successfully with obj.id', async () => {
      const payload = { obj: { id: 12345 } };
      const req = {
        rawBody,
        body: payload,
      } as unknown as RawBodyRequest<Request>;

      mockPaymentService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handlePaymobWebhook(req, querySignature);

      expect(result).toEqual({ received: true });
      expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(
        PaymentProviderType.PAYMOB,
        rawBody,
        querySignature,
        '12345',
        payload,
      );
    });

    it('should handle paymob webhook successfully with fallback top-level id', async () => {
      const payload = { id: 'pm_top_123' };
      const req = {
        rawBody,
        body: payload,
      } as unknown as RawBodyRequest<Request>;

      mockPaymentService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handlePaymobWebhook(req, querySignature);

      expect(result).toEqual({ received: true });
      expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(
        PaymentProviderType.PAYMOB,
        rawBody,
        querySignature,
        'pm_top_123',
        payload,
      );
    });
  });
});
