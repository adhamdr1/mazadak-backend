import { BadRequestException } from '@nestjs/common';

export class WithdrawalNotInProgressException extends BadRequestException {
  constructor() {
    super('WITHDRAWAL_NOT_IN_PROGRESS');
  }
}
