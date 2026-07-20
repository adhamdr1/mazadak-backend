import { BadRequestException } from '@nestjs/common';

export class ImageTooLargeException extends BadRequestException {
  constructor() {
    super('Image size exceeds 5MB limit');
  }
}
