import { BadRequestException } from '@nestjs/common';

export class AutoBidInsufficientBalanceException extends BadRequestException {
  constructor() {
    super(
      'Insufficient wallet balance to configure or execute this auto-bid amount',
    );
  }
}
