"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewAlreadyExistsException = void 0;
const common_1 = require("@nestjs/common");
class ReviewAlreadyExistsException extends common_1.ConflictException {
    constructor() {
        super('REVIEW_ALREADY_EXISTS');
    }
}
exports.ReviewAlreadyExistsException = ReviewAlreadyExistsException;
//# sourceMappingURL=review-already-exists.exception.js.map