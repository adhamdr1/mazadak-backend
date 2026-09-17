import { BadRequestException } from '@nestjs/common';

export class PayoutMethodAmountExceededException extends BadRequestException {
  constructor(message = 'PAYOUT_METHOD_AMOUNT_EXCEEDED') {
    super(message);
  }
}
