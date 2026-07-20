import { ConflictException } from '@nestjs/common';

export class PhoneAlreadyExistsException extends ConflictException {
  constructor() {
    super('PHONE_ALREADY_EXISTS');
  }
}
