import { ForbiddenException } from '@nestjs/common';

export class EmailNotVerifiedException extends ForbiddenException {
  constructor() {
    super('EMAIL_NOT_VERIFIED');
  }
}
