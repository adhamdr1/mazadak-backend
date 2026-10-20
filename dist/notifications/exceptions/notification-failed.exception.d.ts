import { InternalServerErrorException } from '@nestjs/common';
export declare class NotificationFailedException extends InternalServerErrorException {
    constructor(reason: string, error?: unknown);
}
