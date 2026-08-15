import { ForbiddenException } from '@nestjs/common';

export class ReviewReplyForbiddenException extends ForbiddenException {
  constructor(message = 'REVIEW_REPLY_FORBIDDEN') {
    super(message);
  }
}
