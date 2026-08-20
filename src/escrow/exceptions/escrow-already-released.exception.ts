import { BadRequestException } from '@nestjs/common';

export class EscrowAlreadyReleasedException extends BadRequestException {
  constructor(message = 'ESCROW_ALREADY_RELEASED') {
    super(message);
  }
}
