import { BadRequestException } from '@nestjs/common';

export class AuctionEndTimeInvalidException extends BadRequestException {
  constructor() {
    super('AUCTION_END_TIME_MUST_BE_AFTER_START_TIME');
  }
}
