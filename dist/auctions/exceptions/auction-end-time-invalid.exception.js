"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionEndTimeInvalidException = void 0;
const common_1 = require("@nestjs/common");
class AuctionEndTimeInvalidException extends common_1.BadRequestException {
    constructor() {
        super('AUCTION_END_TIME_MUST_BE_AFTER_START_TIME');
    }
}
exports.AuctionEndTimeInvalidException = AuctionEndTimeInvalidException;
//# sourceMappingURL=auction-end-time-invalid.exception.js.map