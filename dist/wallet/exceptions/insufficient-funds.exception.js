"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsufficientFundsException = void 0;
const common_1 = require("@nestjs/common");
class InsufficientFundsException extends common_1.BadRequestException {
    constructor() {
        super('INSUFFICIENT_FUNDS');
    }
}
exports.InsufficientFundsException = InsufficientFundsException;
//# sourceMappingURL=insufficient-funds.exception.js.map