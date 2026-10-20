"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAuctionByIdQuery = void 0;
const cqrs_1 = require("@nestjs/cqrs");
class GetAuctionByIdQuery extends cqrs_1.Query {
    auctionId;
    constructor(auctionId) {
        super();
        this.auctionId = auctionId;
    }
}
exports.GetAuctionByIdQuery = GetAuctionByIdQuery;
//# sourceMappingURL=get-auction-by-id.query.js.map