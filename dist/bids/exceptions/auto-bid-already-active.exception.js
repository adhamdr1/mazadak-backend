"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBidAlreadyActiveException = void 0;
const common_1 = require("@nestjs/common");
class AutoBidAlreadyActiveException extends common_1.BadRequestException {
    constructor() {
        super('You already have an active auto-bid configuration for this auction');
    }
}
exports.AutoBidAlreadyActiveException = AutoBidAlreadyActiveException;
//# sourceMappingURL=auto-bid-already-active.exception.js.map