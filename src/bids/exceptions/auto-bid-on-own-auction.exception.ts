import { BadRequestException } from '@nestjs/common';

export class AutoBidOnOwnAuctionException extends BadRequestException {
  constructor() {
    super('You cannot set an auto-bid on your own auction');
  }
}
