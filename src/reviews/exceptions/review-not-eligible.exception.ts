import { BadRequestException } from '@nestjs/common';

export class ReviewNotEligibleException extends BadRequestException {
  constructor(message = 'REVIEW_NOT_ELIGIBLE') {
    super(message);
  }
}
