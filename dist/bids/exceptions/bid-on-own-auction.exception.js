"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidOnOwnAuctionException = void 0;
const common_1 = require("@nestjs/common");
class BidOnOwnAuctionException extends common_1.ForbiddenException {
    constructor() {
        super('You cannot place a bid on your own auction');
    }
}
exports.BidOnOwnAuctionException = BidOnOwnAuctionException;
//# sourceMappingURL=bid-on-own-auction.exception.js.map