"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBidMaxTooLowException = void 0;
const common_1 = require("@nestjs/common");
class AutoBidMaxTooLowException extends common_1.BadRequestException {
    constructor() {
        super('The maximum auto-bid amount must be at least the next minimum bid amount');
    }
}
exports.AutoBidMaxTooLowException = AutoBidMaxTooLowException;
//# sourceMappingURL=auto-bid-max-too-low.exception.js.map