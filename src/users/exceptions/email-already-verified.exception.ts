import { BadRequestException } from '@nestjs/common';

export class EmailAlreadyVerifiedException extends BadRequestException {
  constructor() {
    super('EMAIL_ALREADY_VERIFIED');
  }
}
