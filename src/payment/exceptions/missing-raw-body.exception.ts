import { BadRequestException } from '@nestjs/common';

export class MissingRawBodyException extends BadRequestException {
  constructor() {
    super('Missing raw body', 'MISSING_RAW_BODY');
  }
}
