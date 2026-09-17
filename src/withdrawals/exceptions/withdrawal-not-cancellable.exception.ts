import { BadRequestException } from '@nestjs/common';

export class WithdrawalNotCancellableException extends BadRequestException {
  constructor() {
    super('WITHDRAWAL_NOT_CANCELLABLE');
  }
}
