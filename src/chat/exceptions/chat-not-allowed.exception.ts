import { BadRequestException } from '@nestjs/common';

export class ChatNotAllowedException extends BadRequestException {
  constructor() {
    super('CHAT_NOT_ALLOWED');
  }
}
