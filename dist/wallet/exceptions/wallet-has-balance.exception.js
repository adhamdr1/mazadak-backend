"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletHasBalanceException = void 0;
const common_1 = require("@nestjs/common");
class WalletHasBalanceException extends common_1.BadRequestException {
    constructor() {
        super('WALLET_HAS_BALANCE');
    }
}
exports.WalletHasBalanceException = WalletHasBalanceException;
//# sourceMappingURL=wallet-has-balance.exception.js.map