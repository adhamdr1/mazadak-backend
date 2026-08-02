import { ForbiddenException } from '@nestjs/common';

export class CannotBanAdminException extends ForbiddenException {
  constructor() {
    super('CANNOT_BAN_ADMIN');
  }
}
