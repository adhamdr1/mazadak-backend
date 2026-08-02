import { UnauthorizedException } from '@nestjs/common';

export class AccountBannedException extends UnauthorizedException {
  constructor() {
    super('ACCOUNT_BANNED');
  }
}
