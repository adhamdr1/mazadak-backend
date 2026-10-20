"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionForbiddenException = void 0;
const common_1 = require("@nestjs/common");
class AuctionForbiddenException extends common_1.ForbiddenException {
    constructor() {
        super('AUCTION_FORBIDDEN');
    }
}
exports.AuctionForbiddenException = AuctionForbiddenException;
//# sourceMappingURL=auction-forbidden.exception.js.map