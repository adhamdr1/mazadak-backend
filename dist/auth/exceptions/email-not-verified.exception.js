"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailNotVerifiedException = void 0;
const common_1 = require("@nestjs/common");
class EmailNotVerifiedException extends common_1.ForbiddenException {
    constructor() {
        super('EMAIL_NOT_VERIFIED');
    }
}
exports.EmailNotVerifiedException = EmailNotVerifiedException;
//# sourceMappingURL=email-not-verified.exception.js.map