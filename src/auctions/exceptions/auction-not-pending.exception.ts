import { BadRequestException } from '@nestjs/common';

export class AuctionNotPendingException extends BadRequestException {
  constructor() {
    super('AUCTION_NOT_PENDING');
  }
}
