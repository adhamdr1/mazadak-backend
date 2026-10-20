"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowUnauthorizedException = void 0;
const common_1 = require("@nestjs/common");
class EscrowUnauthorizedException extends common_1.ForbiddenException {
    constructor(message = 'ESCROW_UNAUTHORIZED') {
        super(message);
    }
}
exports.EscrowUnauthorizedException = EscrowUnauthorizedException;
//# sourceMappingURL=escrow-unauthorized.exception.js.map