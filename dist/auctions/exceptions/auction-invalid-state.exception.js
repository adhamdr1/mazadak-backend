"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionInvalidStateException = void 0;
const common_1 = require("@nestjs/common");
class AuctionInvalidStateException extends common_1.BadRequestException {
    constructor() {
        super('AUCTION_INVALID_STATE');
    }
}
exports.AuctionInvalidStateException = AuctionInvalidStateException;
//# sourceMappingURL=auction-invalid-state.exception.js.map