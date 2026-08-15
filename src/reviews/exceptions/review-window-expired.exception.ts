import { BadRequestException } from '@nestjs/common';

export class ReviewWindowExpiredException extends BadRequestException {
  constructor() {
    super('REVIEW_WINDOW_EXPIRED');
  }
}
