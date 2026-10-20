"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalNotRejectableException = void 0;
const common_1 = require("@nestjs/common");
class WithdrawalNotRejectableException extends common_1.BadRequestException {
    constructor() {
        super('WITHDRAWAL_NOT_REJECTABLE');
    }
}
exports.WithdrawalNotRejectableException = WithdrawalNotRejectableException;
//# sourceMappingURL=withdrawal-not-rejectable.exception.js.map