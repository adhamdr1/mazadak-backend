"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserForbiddenException = void 0;
const common_1 = require("@nestjs/common");
class UserForbiddenException extends common_1.ForbiddenException {
    constructor() {
        super('USER_FORBIDDEN');
    }
}
exports.UserForbiddenException = UserForbiddenException;
//# sourceMappingURL=user-forbidden.exception.js.map