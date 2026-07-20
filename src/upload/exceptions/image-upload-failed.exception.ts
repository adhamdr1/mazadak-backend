import { InternalServerErrorException } from '@nestjs/common';

export class ImageUploadFailedException extends InternalServerErrorException {
  constructor(message?: string) {
    super(message || 'IMAGE_UPLOAD_FAILED');
  }
}
