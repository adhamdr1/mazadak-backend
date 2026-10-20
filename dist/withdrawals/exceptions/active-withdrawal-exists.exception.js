"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveWithdrawalExistsException = void 0;
const common_1 = require("@nestjs/common");
class ActiveWithdrawalExistsException extends common_1.ConflictException {
    constructor() {
        super('ACTIVE_WITHDRAWAL_EXISTS');
    }
}
exports.ActiveWithdrawalExistsException = ActiveWithdrawalExistsException;
//# sourceMappingURL=active-withdrawal-exists.exception.js.map