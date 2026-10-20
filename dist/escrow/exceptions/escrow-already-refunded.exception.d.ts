import { BadRequestException } from '@nestjs/common';
export declare class EscrowAlreadyRefundedException extends BadRequestException {
    constructor(message?: string);
}
