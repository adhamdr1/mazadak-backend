"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookSignatureVerificationFailedException = void 0;
const common_1 = require("@nestjs/common");
class WebhookSignatureVerificationFailedException extends common_1.BadRequestException {
    constructor() {
        super('WEBHOOK_SIGNATURE_VERIFICATION_FAILED');
    }
}
exports.WebhookSignatureVerificationFailedException = WebhookSignatureVerificationFailedException;
//# sourceMappingURL=webhook-signature-verification-failed.exception.js.map