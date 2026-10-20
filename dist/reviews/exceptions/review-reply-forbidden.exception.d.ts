import { ForbiddenException } from '@nestjs/common';
export declare class ReviewReplyForbiddenException extends ForbiddenException {
    constructor(message?: string);
}
