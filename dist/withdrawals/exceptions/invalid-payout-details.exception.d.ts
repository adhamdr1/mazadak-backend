import { BadRequestException } from '@nestjs/common';
export declare class InvalidPayoutDetailsException extends BadRequestException {
    constructor(message?: string);
}
