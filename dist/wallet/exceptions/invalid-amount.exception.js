"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidAmountException = void 0;
const common_1 = require("@nestjs/common");
class InvalidAmountException extends common_1.BadRequestException {
    constructor() {
        super('INVALID_AMOUNT');
    }
}
exports.InvalidAmountException = InvalidAmountException;
//# sourceMappingURL=invalid-amount.exception.js.map