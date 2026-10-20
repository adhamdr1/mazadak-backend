"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionCurrencyMismatchException = void 0;
const common_1 = require("@nestjs/common");
class TransactionCurrencyMismatchException extends common_1.BadRequestException {
    constructor(expected, actual) {
        super(`TRANSACTION_CURRENCY_MISMATCH: Expected ${expected}, got ${actual}`);
    }
}
exports.TransactionCurrencyMismatchException = TransactionCurrencyMismatchException;
//# sourceMappingURL=transaction-currency-mismatch.exception.js.map