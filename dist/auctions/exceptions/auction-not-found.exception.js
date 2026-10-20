"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class AuctionNotFoundException extends common_1.NotFoundException {
    constructor() {
        super('AUCTION_NOT_FOUND');
    }
}
exports.AuctionNotFoundException = AuctionNotFoundException;
//# sourceMappingURL=auction-not-found.exception.js.map