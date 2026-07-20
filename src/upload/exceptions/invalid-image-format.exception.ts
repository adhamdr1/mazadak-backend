import { BadRequestException } from '@nestjs/common';

export class InvalidImageFormatException extends BadRequestException {
  constructor() {
    super('INVALID_IMAGE_FORMAT');
  }
}
