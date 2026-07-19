import { ForbiddenException } from '@nestjs/common';

export class AuctionForbiddenException extends ForbiddenException {
  constructor() {
    super('AUCTION_FORBIDDEN');
  }
}
