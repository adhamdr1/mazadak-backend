"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBidNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class AutoBidNotFoundException extends common_1.NotFoundException {
    constructor() {
        super('No active auto-bid configuration found for this auction');
    }
}
exports.AutoBidNotFoundException = AutoBidNotFoundException;
//# sourceMappingURL=auto-bid-not-found.exception.js.map