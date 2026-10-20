"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalNotInProgressException = void 0;
const common_1 = require("@nestjs/common");
class WithdrawalNotInProgressException extends common_1.BadRequestException {
    constructor() {
        super('WITHDRAWAL_NOT_IN_PROGRESS');
    }
}
exports.WithdrawalNotInProgressException = WithdrawalNotInProgressException;
//# sourceMappingURL=withdrawal-not-in-progress.exception.js.map