import { BadRequestException } from '@nestjs/common';
export declare class PayoutMethodAmountExceededException extends BadRequestException {
    constructor(message?: string);
}
