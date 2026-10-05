import { ForbiddenException } from '@nestjs/common';

export class NotAuctionParticipantException extends ForbiddenException {
  constructor(message = 'NOT_AUCTION_PARTICIPANT') {
    super(message);
  }
}
