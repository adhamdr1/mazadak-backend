import { ForbiddenException } from '@nestjs/common';

export class BidOnOwnAuctionException extends ForbiddenException {
  constructor() {
    super('You cannot place a bid on your own auction');
  }
}
