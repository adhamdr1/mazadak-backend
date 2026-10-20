"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalNotCancellableException = void 0;
const common_1 = require("@nestjs/common");
class WithdrawalNotCancellableException extends common_1.BadRequestException {
    constructor() {
        super('WITHDRAWAL_NOT_CANCELLABLE');
    }
}
exports.WithdrawalNotCancellableException = WithdrawalNotCancellableException;
//# sourceMappingURL=withdrawal-not-cancellable.exception.js.map