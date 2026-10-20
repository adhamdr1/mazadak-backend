"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class ReviewNotFoundException extends common_1.NotFoundException {
    constructor() {
        super('REVIEW_NOT_FOUND');
    }
}
exports.ReviewNotFoundException = ReviewNotFoundException;
//# sourceMappingURL=review-not-found.exception.js.map