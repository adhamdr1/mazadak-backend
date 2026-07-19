import { BadRequestException } from '@nestjs/common';

export class AuctionInvalidStateException extends BadRequestException {
  constructor() {
    super('AUCTION_INVALID_STATE');
  }
}
