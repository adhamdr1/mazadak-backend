import { UnauthorizedException } from '@nestjs/common';

export class AccountSoftDeletedException extends UnauthorizedException {
  constructor() {
    super('ACCOUNT_SOFT_DELETED');
  }
}
