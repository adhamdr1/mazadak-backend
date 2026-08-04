import { BadRequestException } from '@nestjs/common';

export class MissingHmacSignatureException extends BadRequestException {
  constructor() {
    super('Missing hmac signature in query', 'MISSING_HMAC_SIGNATURE');
  }
}
