import { BadRequestException } from '@nestjs/common';

export class MissingSignatureHeaderException extends BadRequestException {
  constructor() {
    super('Missing stripe-signature header', 'MISSING_SIGNATURE_HEADER');
  }
}
