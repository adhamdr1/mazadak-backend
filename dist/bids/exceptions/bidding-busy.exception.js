"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiddingBusyException = void 0;
const common_1 = require("@nestjs/common");
class BiddingBusyException extends common_1.ConflictException {
    constructor() {
        super('High bidding volume on this auction. Please try again in a moment.');
    }
}
exports.BiddingBusyException = BiddingBusyException;
//# sourceMappingURL=bidding-busy.exception.js.map