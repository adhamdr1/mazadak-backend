import { BadRequestException } from '@nestjs/common';

export class EscrowAlreadyRefundedException extends BadRequestException {
  constructor(message = 'ESCROW_ALREADY_REFUNDED') {
    super(message);
  }
}
