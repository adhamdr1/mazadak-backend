import { BadRequestException } from '@nestjs/common';

export class ReviewSelfRatingException extends BadRequestException {
  constructor() {
    super('CANNOT_REVIEW_YOURSELF');
  }
}
