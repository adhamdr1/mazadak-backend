import { NotFoundException } from '@nestjs/common';

export class EscrowNotFoundException extends NotFoundException {
  constructor(message = 'ESCROW_NOT_FOUND') {
    super(message);
  }
}
