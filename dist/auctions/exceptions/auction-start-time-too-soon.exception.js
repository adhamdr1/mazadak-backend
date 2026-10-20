"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionStartTimeTooSoonException = void 0;
const common_1 = require("@nestjs/common");
class AuctionStartTimeTooSoonException extends common_1.BadRequestException {
    constructor() {
        super('AUCTION_START_TIME_TOO_SOON');
    }
}
exports.AuctionStartTimeTooSoonException = AuctionStartTimeTooSoonException;
//# sourceMappingURL=auction-start-time-too-soon.exception.js.map