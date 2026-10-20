import { BadRequestException } from '@nestjs/common';
export declare class InvalidEscrowActionException extends BadRequestException {
    constructor(message?: string);
}
