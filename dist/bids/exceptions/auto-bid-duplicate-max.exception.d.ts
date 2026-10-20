import { BadRequestException } from '@nestjs/common';
export declare class AutoBidDuplicateMaxException extends BadRequestException {
    constructor(suggestedMinAmount?: number);
}
