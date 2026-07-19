import { BadRequestException } from '@nestjs/common';

export class AuctionStartTimeTooSoonException extends BadRequestException {
  constructor() {
    super('AUCTION_START_TIME_TOO_SOON');
  }
}
