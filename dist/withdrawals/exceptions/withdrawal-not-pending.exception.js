"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalNotPendingException = void 0;
const common_1 = require("@nestjs/common");
class WithdrawalNotPendingException extends common_1.BadRequestException {
    constructor() {
        super('WITHDRAWAL_NOT_PENDING');
    }
}
exports.WithdrawalNotPendingException = WithdrawalNotPendingException;
//# sourceMappingURL=withdrawal-not-pending.exception.js.map