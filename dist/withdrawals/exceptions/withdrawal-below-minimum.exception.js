"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalBelowMinimumException = void 0;
const common_1 = require("@nestjs/common");
class WithdrawalBelowMinimumException extends common_1.BadRequestException {
    constructor() {
        super('WITHDRAWAL_BELOW_MINIMUM');
    }
}
exports.WithdrawalBelowMinimumException = WithdrawalBelowMinimumException;
//# sourceMappingURL=withdrawal-below-minimum.exception.js.map