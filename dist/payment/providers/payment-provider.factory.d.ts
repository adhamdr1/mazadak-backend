import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import { StripeProvider } from './stripe.provider';
import { PaymobProvider } from './paymob.provider';
import { PaymentProviderType } from '../enums/payment-provider-type.enum';
export declare class PaymentProviderFactory {
    private readonly stripeProvider;
    private readonly paymobProvider;
    constructor(stripeProvider: StripeProvider, paymobProvider: PaymobProvider);
    getProvider(provider: PaymentProviderType): IPaymentProvider;
}
