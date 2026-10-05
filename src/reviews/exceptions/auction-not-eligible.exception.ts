import { BadRequestException } from '@nestjs/common';

export class AuctionNotEligibleForReviewException extends BadRequestException {
  constructor(message = 'AUCTION_NOT_ELIGIBLE_FOR_REVIEW') {
    super(message);
  }
}
