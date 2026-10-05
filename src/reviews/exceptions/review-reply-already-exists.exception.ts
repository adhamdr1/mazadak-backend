import { ConflictException } from '@nestjs/common';

export class ReviewReplyAlreadyExistsException extends ConflictException {
  constructor(message = 'REPLY_ALREADY_EXISTS') {
    super(message);
  }
}
