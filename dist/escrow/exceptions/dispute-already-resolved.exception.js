"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeAlreadyResolvedException = void 0;
const common_1 = require("@nestjs/common");
class DisputeAlreadyResolvedException extends common_1.BadRequestException {
    constructor(message = 'DISPUTE_ALREADY_RESOLVED') {
        super(message);
    }
}
exports.DisputeAlreadyResolvedException = DisputeAlreadyResolvedException;
//# sourceMappingURL=dispute-already-resolved.exception.js.map