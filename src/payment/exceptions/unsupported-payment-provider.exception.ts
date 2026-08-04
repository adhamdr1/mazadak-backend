import { BadRequestException } from '@nestjs/common';

export class UnsupportedPaymentProviderException extends BadRequestException {
  constructor(provider: string) {
    super(`UNSUPPORTED_PAYMENT_PROVIDER: ${provider}`);
  }
}
