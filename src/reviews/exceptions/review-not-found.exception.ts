import { NotFoundException } from '@nestjs/common';

export class ReviewNotFoundException extends NotFoundException {
  constructor() {
    super('REVIEW_NOT_FOUND');
  }
}
