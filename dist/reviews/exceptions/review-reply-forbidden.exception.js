"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewReplyForbiddenException = void 0;
const common_1 = require("@nestjs/common");
class ReviewReplyForbiddenException extends common_1.ForbiddenException {
    constructor(message = 'REVIEW_REPLY_FORBIDDEN') {
        super(message);
    }
}
exports.ReviewReplyForbiddenException = ReviewReplyForbiddenException;
//# sourceMappingURL=review-reply-forbidden.exception.js.map