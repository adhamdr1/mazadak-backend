import { ConflictException } from '@nestjs/common';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super('EMAIL_ALREADY_EXISTS');
  }
}
