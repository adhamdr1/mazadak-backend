import { BadRequestException } from '@nestjs/common';

export class WithdrawalBelowMinimumException extends BadRequestException {
  constructor() {
    super('WITHDRAWAL_BELOW_MINIMUM');
  }
}
