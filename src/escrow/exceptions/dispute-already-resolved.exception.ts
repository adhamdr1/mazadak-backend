import { BadRequestException } from '@nestjs/common';

export class DisputeAlreadyResolvedException extends BadRequestException {
  constructor(message = 'DISPUTE_ALREADY_RESOLVED') {
    super(message);
  }
}
