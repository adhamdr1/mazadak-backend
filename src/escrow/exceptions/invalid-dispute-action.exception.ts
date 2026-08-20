import { BadRequestException } from '@nestjs/common';

export class InvalidDisputeActionException extends BadRequestException {
  constructor(message = 'INVALID_DISPUTE_ACTION') {
    super(message);
  }
}
