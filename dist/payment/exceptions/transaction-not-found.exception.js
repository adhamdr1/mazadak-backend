"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class TransactionNotFoundException extends common_1.NotFoundException {
    constructor() {
        super('TRANSACTION_NOT_FOUND');
    }
}
exports.TransactionNotFoundException = TransactionNotFoundException;
//# sourceMappingURL=transaction-not-found.exception.js.map