import { NotFoundException } from '@nestjs/common';

export class WithdrawalNotFoundException extends NotFoundException {
  constructor() {
    super('WITHDRAWAL_NOT_FOUND');
  }
}
