import { BadRequestException } from '@nestjs/common';

export class InvalidPayoutDetailsException extends BadRequestException {
  constructor(message = 'INVALID_PAYOUT_DETAILS') {
    super(message);
  }
}
