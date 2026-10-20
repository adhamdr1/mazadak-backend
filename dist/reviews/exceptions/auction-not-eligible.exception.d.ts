import { BadRequestException } from '@nestjs/common';
export declare class AuctionNotEligibleForReviewException extends BadRequestException {
    constructor(message?: string);
}
