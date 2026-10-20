"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionNotActiveException = void 0;
const common_1 = require("@nestjs/common");
class AuctionNotActiveException extends common_1.BadRequestException {
    constructor() {
        super('This auction is not currently active');
    }
}
exports.AuctionNotActiveException = AuctionNotActiveException;
//# sourceMappingURL=auction-not-active.exception.js.map