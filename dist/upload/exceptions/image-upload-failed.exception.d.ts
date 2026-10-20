import { InternalServerErrorException } from '@nestjs/common';
export declare class ImageUploadFailedException extends InternalServerErrorException {
    constructor(message?: string);
}
