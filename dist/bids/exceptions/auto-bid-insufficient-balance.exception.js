"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBidInsufficientBalanceException = void 0;
const common_1 = require("@nestjs/common");
class AutoBidInsufficientBalanceException extends common_1.BadRequestException {
    constructor() {
        super('Insufficient wallet balance to configure or execute this auto-bid amount');
    }
}
exports.AutoBidInsufficientBalanceException = AutoBidInsufficientBalanceException;
//# sourceMappingURL=auto-bid-insufficient-balance.exception.js.map