"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedPaymentProviderException = void 0;
const common_1 = require("@nestjs/common");
class UnsupportedPaymentProviderException extends common_1.BadRequestException {
    constructor(provider) {
        super(`UNSUPPORTED_PAYMENT_PROVIDER: ${provider}`);
    }
}
exports.UnsupportedPaymentProviderException = UnsupportedPaymentProviderException;
//# sourceMappingURL=unsupported-payment-provider.exception.js.map