import { ForbiddenException } from '@nestjs/common';
export declare class NotAuctionParticipantException extends ForbiddenException {
    constructor(message?: string);
}
