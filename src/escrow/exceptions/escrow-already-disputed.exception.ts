import { BadRequestException } from '@nestjs/common';

export class EscrowAlreadyDisputedException extends BadRequestException {
  constructor(message = 'ESCROW_ALREADY_DISPUTED') {
    super(message);
  }
}
