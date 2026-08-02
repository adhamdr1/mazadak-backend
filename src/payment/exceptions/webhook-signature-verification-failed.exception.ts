import { BadRequestException } from '@nestjs/common';

export class WebhookSignatureVerificationFailedException extends BadRequestException {
  constructor() {
    super('WEBHOOK_SIGNATURE_VERIFICATION_FAILED');
  }
}
