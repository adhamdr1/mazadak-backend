import { BadRequestException } from '@nestjs/common';

export class AutoBidMaxTooLowException extends BadRequestException {
  constructor() {
    super(
      'The maximum auto-bid amount must be at least the next minimum bid amount',
    );
  }
}
