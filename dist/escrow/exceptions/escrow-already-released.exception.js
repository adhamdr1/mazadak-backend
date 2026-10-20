"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowAlreadyReleasedException = void 0;
const common_1 = require("@nestjs/common");
class EscrowAlreadyReleasedException extends common_1.BadRequestException {
    constructor(message = 'ESCROW_ALREADY_RELEASED') {
        super(message);
    }
}
exports.EscrowAlreadyReleasedException = EscrowAlreadyReleasedException;
//# sourceMappingURL=escrow-already-released.exception.js.map