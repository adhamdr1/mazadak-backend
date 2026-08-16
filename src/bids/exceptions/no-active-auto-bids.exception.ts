import { BadRequestException } from '@nestjs/common';

export class NoActiveAutoBidsException extends BadRequestException {
  constructor() {
    super('Cannot evaluate proxy bidding with no active auto-bids');
  }
}
