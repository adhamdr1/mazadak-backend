import { BadRequestException } from '@nestjs/common';

export class AutoBidDuplicateMaxException extends BadRequestException {
  constructor(suggestedMinAmount?: number) {
    super(
      suggestedMinAmount
        ? `Another bidder has already set an auto-bid with this maximum amount. Please set a higher amount (at least ${suggestedMinAmount}).`
        : 'Another bidder has already set an auto-bid with this maximum amount. Please choose a higher maximum amount.',
    );
  }
}
