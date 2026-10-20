"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountDisabledException = void 0;
const common_1 = require("@nestjs/common");
class AccountDisabledException extends common_1.UnauthorizedException {
    constructor() {
        super('ACCOUNT_DISABLED');
    }
}
exports.AccountDisabledException = AccountDisabledException;
//# sourceMappingURL=account-disabled.exception.js.map