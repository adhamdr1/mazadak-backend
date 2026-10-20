"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidTokenException = void 0;
const common_1 = require("@nestjs/common");
class InvalidTokenException extends common_1.BadRequestException {
    constructor() {
        super('INVALID_OR_EXPIRED_TOKEN');
    }
}
exports.InvalidTokenException = InvalidTokenException;
//# sourceMappingURL=invalid-token.exception.js.map