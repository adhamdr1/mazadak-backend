"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionAmountMismatchException = void 0;
const common_1 = require("@nestjs/common");
class TransactionAmountMismatchException extends common_1.BadRequestException {
    constructor(expected, actual) {
        super(`TRANSACTION_AMOUNT_MISMATCH: Expected ${expected}, got ${actual}`);
    }
}
exports.TransactionAmountMismatchException = TransactionAmountMismatchException;
//# sourceMappingURL=transaction-amount-mismatch.exception.js.map