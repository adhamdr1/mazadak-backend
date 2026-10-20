"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewWindowExpiredException = void 0;
const common_1 = require("@nestjs/common");
class ReviewWindowExpiredException extends common_1.BadRequestException {
    constructor() {
        super('REVIEW_WINDOW_EXPIRED');
    }
}
exports.ReviewWindowExpiredException = ReviewWindowExpiredException;
//# sourceMappingURL=review-window-expired.exception.js.map