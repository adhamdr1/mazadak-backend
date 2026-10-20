import { BadRequestException } from '@nestjs/common';
export declare class DisputeAlreadyResolvedException extends BadRequestException {
    constructor(message?: string);
}
