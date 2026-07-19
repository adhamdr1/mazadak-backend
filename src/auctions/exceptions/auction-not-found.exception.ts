import { NotFoundException } from '@nestjs/common';

export class AuctionNotFoundException extends NotFoundException {
  constructor() {
    super('AUCTION_NOT_FOUND');
  }
}
