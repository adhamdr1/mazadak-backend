import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { PaymentProviderType } from '../enums/payment-provider-type.enum';

export class InitializePaymentDto {
  @IsEnum(PaymentProviderType)
  provider!: PaymentProviderType;

  @IsNumber()
  @Min(1)
  amount!: number; // minor units (e.g. cents)

  @IsString()
  currency!: string;
}
