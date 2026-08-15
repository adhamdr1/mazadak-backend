import { ConflictException } from '@nestjs/common';

export class ReviewAlreadyExistsException extends ConflictException {
  constructor() {
    super('REVIEW_ALREADY_EXISTS');
  }
}
