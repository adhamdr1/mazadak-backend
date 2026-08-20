import { BadRequestException } from '@nestjs/common';

export class DisputeWindowExpiredException extends BadRequestException {
  constructor(message = 'DISPUTE_WINDOW_EXPIRED') {
    super(message);
  }
}
