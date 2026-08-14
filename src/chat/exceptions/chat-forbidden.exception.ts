import { ForbiddenException } from '@nestjs/common';

export class ChatForbiddenException extends ForbiddenException {
  constructor() {
    super('CHAT_FORBIDDEN');
  }
}
