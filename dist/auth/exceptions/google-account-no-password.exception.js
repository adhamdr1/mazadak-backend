"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAccountNoPasswordException = void 0;
const common_1 = require("@nestjs/common");
class GoogleAccountNoPasswordException extends common_1.BadRequestException {
    constructor() {
        super('GOOGLE_ACCOUNT_NO_PASSWORD');
    }
}
exports.GoogleAccountNoPasswordException = GoogleAccountNoPasswordException;
//# sourceMappingURL=google-account-no-password.exception.js.map