import { ForbiddenException } from '@nestjs/common';
export declare class EscrowUnauthorizedException extends ForbiddenException {
    constructor(message?: string);
}
