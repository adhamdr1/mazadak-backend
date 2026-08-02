import { BadRequestException } from '@nestjs/common';

export class TransactionAmountMismatchException extends BadRequestException {
  constructor(expected: number, actual: number) {
    super(`TRANSACTION_AMOUNT_MISMATCH: Expected ${expected}, got ${actual}`);
  }
}
