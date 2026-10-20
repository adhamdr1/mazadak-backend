"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class EscrowNotFoundException extends common_1.NotFoundException {
    constructor(message = 'ESCROW_NOT_FOUND') {
        super(message);
    }
}
exports.EscrowNotFoundException = EscrowNotFoundException;
//# sourceMappingURL=escrow-not-found.exception.js.map