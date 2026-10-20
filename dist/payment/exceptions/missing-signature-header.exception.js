"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingSignatureHeaderException = void 0;
const common_1 = require("@nestjs/common");
class MissingSignatureHeaderException extends common_1.BadRequestException {
    constructor() {
        super('Missing stripe-signature header', 'MISSING_SIGNATURE_HEADER');
    }
}
exports.MissingSignatureHeaderException = MissingSignatureHeaderException;
//# sourceMappingURL=missing-signature-header.exception.js.map