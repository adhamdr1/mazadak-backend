"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBidOnOwnAuctionException = void 0;
const common_1 = require("@nestjs/common");
class AutoBidOnOwnAuctionException extends common_1.BadRequestException {
    constructor() {
        super('You cannot set an auto-bid on your own auction');
    }
}
exports.AutoBidOnOwnAuctionException = AutoBidOnOwnAuctionException;
//# sourceMappingURL=auto-bid-on-own-auction.exception.js.map