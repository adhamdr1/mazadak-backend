import { BadRequestException } from '@nestjs/common';

export class InvalidEscrowActionException extends BadRequestException {
  constructor(message = 'ESCROW_INVALID_STATUS') {
    super(message);
  }
}
