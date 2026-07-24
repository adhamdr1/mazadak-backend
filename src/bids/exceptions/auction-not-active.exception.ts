import { BadRequestException } from '@nestjs/common';

export class AuctionNotActiveException extends BadRequestException {
  constructor() {
    super('This auction is not currently active');
  }
}
