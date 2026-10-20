"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAlreadyExistsException = void 0;
const common_1 = require("@nestjs/common");
class EmailAlreadyExistsException extends common_1.ConflictException {
    constructor() {
        super('EMAIL_ALREADY_EXISTS');
    }
}
exports.EmailAlreadyExistsException = EmailAlreadyExistsException;
//# sourceMappingURL=email-already-exists.exception.js.map