"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidEscrowActionException = void 0;
const common_1 = require("@nestjs/common");
class InvalidEscrowActionException extends common_1.BadRequestException {
    constructor(message = 'ESCROW_INVALID_STATUS') {
        super(message);
    }
}
exports.InvalidEscrowActionException = InvalidEscrowActionException;
//# sourceMappingURL=invalid-escrow-action.exception.js.map