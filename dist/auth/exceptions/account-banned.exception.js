"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountBannedException = void 0;
const common_1 = require("@nestjs/common");
class AccountBannedException extends common_1.UnauthorizedException {
    constructor() {
        super('ACCOUNT_BANNED');
    }
}
exports.AccountBannedException = AccountBannedException;
//# sourceMappingURL=account-banned.exception.js.map