import { BadRequestException } from '@nestjs/common';
export declare class TransactionCurrencyMismatchException extends BadRequestException {
    constructor(expected: string, actual: string);
}
