"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneAlreadyExistsException = void 0;
const common_1 = require("@nestjs/common");
class PhoneAlreadyExistsException extends common_1.ConflictException {
    constructor() {
        super('PHONE_ALREADY_EXISTS');
    }
}
exports.PhoneAlreadyExistsException = PhoneAlreadyExistsException;
//# sourceMappingURL=phone-already-exists.exception.js.map