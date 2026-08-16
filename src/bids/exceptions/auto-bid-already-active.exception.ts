import { BadRequestException } from '@nestjs/common';

export class AutoBidAlreadyActiveException extends BadRequestException {
  constructor() {
    super('You already have an active auto-bid configuration for this auction');
  }
}
