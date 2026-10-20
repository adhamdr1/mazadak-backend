"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlreadyHighestBidderException = void 0;
const common_1 = require("@nestjs/common");
class AlreadyHighestBidderException extends common_1.BadRequestException {
    constructor() {
        super('You are already the highest bidder for this auction');
    }
}
exports.AlreadyHighestBidderException = AlreadyHighestBidderException;
//# sourceMappingURL=already-highest-bidder.exception.js.map