"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewNotEligibleException = void 0;
const common_1 = require("@nestjs/common");
class ReviewNotEligibleException extends common_1.BadRequestException {
    constructor(message = 'REVIEW_NOT_ELIGIBLE') {
        super(message);
    }
}
exports.ReviewNotEligibleException = ReviewNotEligibleException;
//# sourceMappingURL=review-not-eligible.exception.js.map