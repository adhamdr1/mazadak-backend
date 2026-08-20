import { NotFoundException } from '@nestjs/common';

export class DisputeNotFoundException extends NotFoundException {
  constructor(message = 'DISPUTE_NOT_FOUND') {
    super(message);
  }
}
