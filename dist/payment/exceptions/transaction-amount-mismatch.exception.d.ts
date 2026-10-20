import { BadRequestException } from '@nestjs/common';
export declare class TransactionAmountMismatchException extends BadRequestException {
    constructor(expected: number, actual: number);
}
