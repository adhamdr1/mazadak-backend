import { BadRequestException } from '@nestjs/common';
export declare class UnsupportedPaymentProviderException extends BadRequestException {
    constructor(provider: string);
}
