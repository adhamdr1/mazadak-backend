import { BadRequestException } from '@nestjs/common';

export class ChatEditTimeoutException extends BadRequestException {
  constructor() {
    super('CHAT_EDIT_TIMEOUT');
  }
}
