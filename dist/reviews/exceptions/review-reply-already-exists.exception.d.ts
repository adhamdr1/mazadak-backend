import { ConflictException } from '@nestjs/common';
export declare class ReviewReplyAlreadyExistsException extends ConflictException {
    constructor(message?: string);
}
