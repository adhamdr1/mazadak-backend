import { ConflictException } from '@nestjs/common';
export declare class EmailAlreadyExistsException extends ConflictException {
    constructor();
}
