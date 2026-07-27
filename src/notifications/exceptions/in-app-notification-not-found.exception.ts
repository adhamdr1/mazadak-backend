import { NotFoundException } from '@nestjs/common';

export class InAppNotificationNotFoundException extends NotFoundException {
  constructor() {
    super('IN_APP_NOTIFICATION_NOT_FOUND');
  }
}
