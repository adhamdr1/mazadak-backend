"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAlreadyVerifiedException = void 0;
const common_1 = require("@nestjs/common");
class EmailAlreadyVerifiedException extends common_1.BadRequestException {
    constructor() {
        super('EMAIL_ALREADY_VERIFIED');
    }
}
exports.EmailAlreadyVerifiedException = EmailAlreadyVerifiedException;
//# sourceMappingURL=email-already-verified.exception.js.map