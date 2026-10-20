"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewReplyAlreadyExistsException = void 0;
const common_1 = require("@nestjs/common");
class ReviewReplyAlreadyExistsException extends common_1.ConflictException {
    constructor(message = 'REPLY_ALREADY_EXISTS') {
        super(message);
    }
}
exports.ReviewReplyAlreadyExistsException = ReviewReplyAlreadyExistsException;
//# sourceMappingURL=review-reply-already-exists.exception.js.map