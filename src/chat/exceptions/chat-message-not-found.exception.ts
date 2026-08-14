import { NotFoundException } from '@nestjs/common';

export class ChatMessageNotFoundException extends NotFoundException {
  constructor() {
    super('CHAT_MESSAGE_NOT_FOUND');
  }
}
