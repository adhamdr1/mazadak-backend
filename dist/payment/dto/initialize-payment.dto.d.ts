import { PaymentProviderType } from '../enums/payment-provider-type.enum';
export declare class InitializePaymentDto {
    provider: PaymentProviderType;
    amount: number;
    currency?: string;
}
