import { ConflictException } from '@nestjs/common';
export declare class PhoneAlreadyExistsException extends ConflictException {
    constructor();
}
