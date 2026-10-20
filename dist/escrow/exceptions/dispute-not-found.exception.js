"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class DisputeNotFoundException extends common_1.NotFoundException {
    constructor(message = 'DISPUTE_NOT_FOUND') {
        super(message);
    }
}
exports.DisputeNotFoundException = DisputeNotFoundException;
//# sourceMappingURL=dispute-not-found.exception.js.map