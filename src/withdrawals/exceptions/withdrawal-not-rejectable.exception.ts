import { BadRequestException } from '@nestjs/common';

export class WithdrawalNotRejectableException extends BadRequestException {
  constructor() {
    super('WITHDRAWAL_NOT_REJECTABLE');
  }
}
