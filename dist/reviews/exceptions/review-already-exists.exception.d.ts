import { ConflictException } from '@nestjs/common';
export declare class ReviewAlreadyExistsException extends ConflictException {
    constructor();
}
