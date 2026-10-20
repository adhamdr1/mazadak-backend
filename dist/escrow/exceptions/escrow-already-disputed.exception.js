"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowAlreadyDisputedException = void 0;
const common_1 = require("@nestjs/common");
class EscrowAlreadyDisputedException extends common_1.BadRequestException {
    constructor(message = 'ESCROW_ALREADY_DISPUTED') {
        super(message);
    }
}
exports.EscrowAlreadyDisputedException = EscrowAlreadyDisputedException;
//# sourceMappingURL=escrow-already-disputed.exception.js.map