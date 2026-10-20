"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidPayoutDetailsException = void 0;
const common_1 = require("@nestjs/common");
class InvalidPayoutDetailsException extends common_1.BadRequestException {
    constructor(message = 'INVALID_PAYOUT_DETAILS') {
        super(message);
    }
}
exports.InvalidPayoutDetailsException = InvalidPayoutDetailsException;
//# sourceMappingURL=invalid-payout-details.exception.js.map