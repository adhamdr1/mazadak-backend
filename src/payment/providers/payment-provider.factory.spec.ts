import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProviderFactory } from './payment-provider.factory';
import { StripeProvider } from './stripe.provider';
import { PaymobProvider } from './paymob.provider';
import { PaymentProviderType } from '../enums/payment-provider-type.enum';
import { UnsupportedPaymentProviderException } from '../exceptions/unsupported-payment-provider.exception';

const mockStripeProvider = {};
const mockPaymobProvider = {};

describe('PaymentProviderFactory', () => {
  let factory: PaymentProviderFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentProviderFactory,
        {
          provide: StripeProvider,
          useValue: mockStripeProvider,
        },
        {
          provide: PaymobProvider,
          useValue: mockPaymobProvider,
        },
      ],
    }).compile();

    factory = module.get<PaymentProviderFactory>(PaymentProviderFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should return StripeProvider for STRIPE', () => {
    const result = factory.getProvider(PaymentProviderType.STRIPE);
    expect(result).toBe(mockStripeProvider);
  });

  it('should return PaymobProvider for PAYMOB', () => {
    const result = factory.getProvider(PaymentProviderType.PAYMOB);
    expect(result).toBe(mockPaymobProvider);
  });

  it('should throw UnsupportedPaymentProviderException for invalid provider', () => {
    expect(() =>
      factory.getProvider('UNKNOWN_PROVIDER' as PaymentProviderType),
    ).toThrow(UnsupportedPaymentProviderException);
  });
});
