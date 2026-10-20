"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeWindowExpiredException = void 0;
const common_1 = require("@nestjs/common");
class DisputeWindowExpiredException extends common_1.BadRequestException {
    constructor(message = 'DISPUTE_WINDOW_EXPIRED') {
        super(message);
    }
}
exports.DisputeWindowExpiredException = DisputeWindowExpiredException;
//# sourceMappingURL=dispute-window-expired.exception.js.map