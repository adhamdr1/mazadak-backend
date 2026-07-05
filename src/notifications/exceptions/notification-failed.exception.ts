// src/notifications/exceptions/notification-failed.exception.ts
import { InternalServerErrorException } from '@nestjs/common';

export class NotificationFailedException extends InternalServerErrorException {
  constructor(reason: string, error?: unknown) {
    // نمرر سبب الخطأ، ونحتفظ بالخطأ الأصلي (cause) للـ Debugging
    super(`Failed to send notification: ${reason}`, { cause: error });
  }
}
