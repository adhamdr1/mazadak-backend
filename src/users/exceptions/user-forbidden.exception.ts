import { ForbiddenException } from '@nestjs/common';

export class UserForbiddenException extends ForbiddenException {
  constructor() {
    super('USER_FORBIDDEN');
  }
}
