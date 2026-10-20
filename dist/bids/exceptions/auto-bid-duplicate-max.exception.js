"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBidDuplicateMaxException = void 0;
const common_1 = require("@nestjs/common");
class AutoBidDuplicateMaxException extends common_1.BadRequestException {
    constructor(suggestedMinAmount) {
        super(suggestedMinAmount
            ? `Another bidder has already set an auto-bid with this maximum amount. Please set a higher amount (at least ${suggestedMinAmount}).`
            : 'Another bidder has already set an auto-bid with this maximum amount. Please choose a higher maximum amount.');
    }
}
exports.AutoBidDuplicateMaxException = AutoBidDuplicateMaxException;
//# sourceMappingURL=auto-bid-duplicate-max.exception.js.map