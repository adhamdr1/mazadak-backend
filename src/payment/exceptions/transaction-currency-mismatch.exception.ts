import { BadRequestException } from '@nestjs/common';

export class TransactionCurrencyMismatchException extends BadRequestException {
  constructor(expected: string, actual: string) {
    super(`TRANSACTION_CURRENCY_MISMATCH: Expected ${expected}, got ${actual}`);
  }
}
