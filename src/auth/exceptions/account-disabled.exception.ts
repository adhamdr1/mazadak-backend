import { UnauthorizedException } from '@nestjs/common';

export class AccountDisabledException extends UnauthorizedException {
  constructor() {
    super('ACCOUNT_DISABLED');
  }
}
