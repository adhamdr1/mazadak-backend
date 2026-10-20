"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountSoftDeletedException = void 0;
const common_1 = require("@nestjs/common");
class AccountSoftDeletedException extends common_1.UnauthorizedException {
    constructor() {
        super('ACCOUNT_SOFT_DELETED');
    }
}
exports.AccountSoftDeletedException = AccountSoftDeletedException;
//# sourceMappingURL=account-soft-deleted.exception.js.map