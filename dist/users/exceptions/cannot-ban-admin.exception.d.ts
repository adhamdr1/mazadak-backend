import { ForbiddenException } from '@nestjs/common';
export declare class CannotBanAdminException extends ForbiddenException {
    constructor();
}
