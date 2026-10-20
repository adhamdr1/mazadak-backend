"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetWalletBalanceQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
class GetWalletBalanceQuery extends cqrs_1.Query {
    userId;
    session;
    constructor(userId, session) {
        super();
        this.userId = userId;
        this.session = session;
    }
}
exports.GetWalletBalanceQuery = GetWalletBalanceQuery;
//# sourceMappingURL=get-wallet-balance.query.js.map