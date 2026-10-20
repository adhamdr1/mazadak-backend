import { BadRequestException } from '@nestjs/common';
export declare class DisputeWindowExpiredException extends BadRequestException {
    constructor(message?: string);
}
