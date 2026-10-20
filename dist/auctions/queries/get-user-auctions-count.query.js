"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserAuctionsCountQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
class GetUserAuctionsCountQuery extends cqrs_1.Query {
    userId;
    constructor(userId) {
        super();
        this.userId = userId;
    }
}
exports.GetUserAuctionsCountQuery = GetUserAuctionsCountQuery;
//# sourceMappingURL=get-user-auctions-count.query.js.map