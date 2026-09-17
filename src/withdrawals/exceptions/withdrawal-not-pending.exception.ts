import { BadRequestException } from '@nestjs/common';

export class WithdrawalNotPendingException extends BadRequestException {
  constructor() {
    super('WITHDRAWAL_NOT_PENDING');
  }
}
