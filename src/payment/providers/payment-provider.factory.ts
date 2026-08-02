import { Injectable } from '@nestjs/common';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import { StripeProvider } from './stripe.provider';
import { PaymobProvider } from './paymob.provider';
import { PaymentProviderType } from '../enums/payment-provider-type.enum';
import { UnsupportedPaymentProviderException } from '../exceptions/unsupported-payment-provider.exception';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly paymobProvider: PaymobProvider,
  ) {}

  getProvider(provider: PaymentProviderType): IPaymentProvider {
    switch (provider) {
      case PaymentProviderType.STRIPE:
        return this.stripeProvider;
      case PaymentProviderType.PAYMOB:
        return this.paymobProvider;
      default:
        throw new UnsupportedPaymentProviderException(provider);
    }
  }
}
