"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionNotEligibleForReviewException = void 0;
const common_1 = require("@nestjs/common");
class AuctionNotEligibleForReviewException extends common_1.BadRequestException {
    constructor(message = 'AUCTION_NOT_ELIGIBLE_FOR_REVIEW') {
        super(message);
    }
}
exports.AuctionNotEligibleForReviewException = AuctionNotEligibleForReviewException;
//# sourceMappingURL=auction-not-eligible.exception.js.map