import { BadRequestException } from '@nestjs/common';

export class GoogleAccountNoPasswordException extends BadRequestException {
  constructor() {
    super('GOOGLE_ACCOUNT_NO_PASSWORD');
  }
}
