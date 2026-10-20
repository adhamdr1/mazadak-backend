import { BadRequestException } from '@nestjs/common';
export declare class EscrowAlreadyDisputedException extends BadRequestException {
    constructor(message?: string);
}
