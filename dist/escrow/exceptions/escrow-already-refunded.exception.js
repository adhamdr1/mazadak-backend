"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowAlreadyRefundedException = void 0;
const common_1 = require("@nestjs/common");
class EscrowAlreadyRefundedException extends common_1.BadRequestException {
    constructor(message = 'ESCROW_ALREADY_REFUNDED') {
        super(message);
    }
}
exports.EscrowAlreadyRefundedException = EscrowAlreadyRefundedException;
//# sourceMappingURL=escrow-already-refunded.exception.js.map