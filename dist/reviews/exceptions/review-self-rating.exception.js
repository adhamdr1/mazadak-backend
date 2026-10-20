"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewSelfRatingException = void 0;
const common_1 = require("@nestjs/common");
class ReviewSelfRatingException extends common_1.BadRequestException {
    constructor() {
        super('CANNOT_REVIEW_YOURSELF');
    }
}
exports.ReviewSelfRatingException = ReviewSelfRatingException;
//# sourceMappingURL=review-self-rating.exception.js.map