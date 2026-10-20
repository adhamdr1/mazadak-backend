"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutMethodAmountExceededException = void 0;
const common_1 = require("@nestjs/common");
class PayoutMethodAmountExceededException extends common_1.BadRequestException {
    constructor(message = 'PAYOUT_METHOD_AMOUNT_EXCEEDED') {
        super(message);
    }
}
exports.PayoutMethodAmountExceededException = PayoutMethodAmountExceededException;
//# sourceMappingURL=payout-method-amount-exceeded.exception.js.map