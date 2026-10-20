"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingHmacSignatureException = void 0;
const common_1 = require("@nestjs/common");
class MissingHmacSignatureException extends common_1.BadRequestException {
    constructor() {
        super('Missing hmac signature in query', 'MISSING_HMAC_SIGNATURE');
    }
}
exports.MissingHmacSignatureException = MissingHmacSignatureException;
//# sourceMappingURL=missing-hmac-signature.exception.js.map