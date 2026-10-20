import { BadRequestException } from '@nestjs/common';
export declare class InvalidDisputeActionException extends BadRequestException {
    constructor(message?: string);
}
