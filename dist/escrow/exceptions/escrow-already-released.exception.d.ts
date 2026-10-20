import { BadRequestException } from '@nestjs/common';
export declare class EscrowAlreadyReleasedException extends BadRequestException {
    constructor(message?: string);
}
