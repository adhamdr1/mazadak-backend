import { ForbiddenException } from '@nestjs/common';

export class EscrowUnauthorizedException extends ForbiddenException {
  constructor(message = 'ESCROW_UNAUTHORIZED') {
    super(message);
  }
}
