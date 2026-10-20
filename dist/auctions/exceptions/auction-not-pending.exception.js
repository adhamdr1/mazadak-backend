"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionNotPendingException = void 0;
const common_1 = require("@nestjs/common");
class AuctionNotPendingException extends common_1.BadRequestException {
    constructor() {
        super('AUCTION_NOT_PENDING');
    }
}
exports.AuctionNotPendingException = AuctionNotPendingException;
//# sourceMappingURL=auction-not-pending.exception.js.map