"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CannotBanAdminException = void 0;
const common_1 = require("@nestjs/common");
class CannotBanAdminException extends common_1.ForbiddenException {
    constructor() {
        super('CANNOT_BAN_ADMIN');
    }
}
exports.CannotBanAdminException = CannotBanAdminException;
//# sourceMappingURL=cannot-ban-admin.exception.js.map