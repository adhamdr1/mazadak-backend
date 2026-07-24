import { BadRequestException } from '@nestjs/common';

export class AlreadyHighestBidderException extends BadRequestException {
  constructor() {
    super('You are already the highest bidder for this auction');
  }
}
