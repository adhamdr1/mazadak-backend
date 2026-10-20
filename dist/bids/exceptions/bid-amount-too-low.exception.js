"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidAmountTooLowException = void 0;
const common_1 = require("@nestjs/common");
class BidAmountTooLowException extends common_1.BadRequestException {
    constructor() {
        super('The bid amount is too low based on the current price and minimum increment');
    }
}
exports.BidAmountTooLowException = BidAmountTooLowException;
//# sourceMappingURL=bid-amount-too-low.exception.js.map