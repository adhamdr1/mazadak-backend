import { BadRequestException } from '@nestjs/common';
export declare class MissingHmacSignatureException extends BadRequestException {
    constructor();
}
