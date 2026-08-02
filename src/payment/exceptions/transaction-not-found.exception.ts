import { NotFoundException } from '@nestjs/common';

export class TransactionNotFoundException extends NotFoundException {
  constructor() {
    super('TRANSACTION_NOT_FOUND');
  }
}
