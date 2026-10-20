"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class WithdrawalNotFoundException extends common_1.NotFoundException {
    constructor() {
        super('WITHDRAWAL_NOT_FOUND');
    }
}
exports.WithdrawalNotFoundException = WithdrawalNotFoundException;
//# sourceMappingURL=withdrawal-not-found.exception.js.map