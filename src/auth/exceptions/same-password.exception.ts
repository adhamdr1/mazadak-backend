import { BadRequestException } from '@nestjs/common';

export class SamePasswordException extends BadRequestException {
  constructor() {
    super('SAME_PASSWORD');
  }
}
