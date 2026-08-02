import { BadRequestException } from '@nestjs/common';

export class MissingEventIdException extends BadRequestException {
  constructor() {
    super('Missing event id in payload', 'MISSING_EVENT_ID');
  }
}
