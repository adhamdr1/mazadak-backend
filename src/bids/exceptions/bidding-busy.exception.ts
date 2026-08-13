import { ConflictException } from '@nestjs/common';

export class BiddingBusyException extends ConflictException {
  constructor() {
    super('High bidding volume on this auction. Please try again in a moment.');
  }
}
