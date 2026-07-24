import { BadRequestException } from '@nestjs/common';

export class BidAmountTooLowException extends BadRequestException {
  constructor() {
    super(
      'The bid amount is too low based on the current price and minimum increment',
    );
  }
}
