"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidDisputeActionException = void 0;
const common_1 = require("@nestjs/common");
class InvalidDisputeActionException extends common_1.BadRequestException {
    constructor(message = 'INVALID_DISPUTE_ACTION') {
        super(message);
    }
}
exports.InvalidDisputeActionException = InvalidDisputeActionException;
//# sourceMappingURL=invalid-dispute-action.exception.js.map