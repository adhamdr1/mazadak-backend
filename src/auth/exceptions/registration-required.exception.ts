import { UnauthorizedException } from '@nestjs/common';

export class RegistrationRequiredException extends UnauthorizedException {
  constructor() {
    super('USER_NOT_FOUND_REQUIRE_REGISTRATION');
  }
}
