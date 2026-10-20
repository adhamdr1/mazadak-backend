"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoActiveAutoBidsException = void 0;
const common_1 = require("@nestjs/common");
class NoActiveAutoBidsException extends common_1.BadRequestException {
    constructor() {
        super('Cannot evaluate proxy bidding with no active auto-bids');
    }
}
exports.NoActiveAutoBidsException = NoActiveAutoBidsException;
//# sourceMappingURL=no-active-auto-bids.exception.js.map