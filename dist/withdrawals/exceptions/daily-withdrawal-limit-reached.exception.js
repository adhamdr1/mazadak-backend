"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyWithdrawalLimitReachedException = void 0;
const common_1 = require("@nestjs/common");
class DailyWithdrawalLimitReachedException extends common_1.BadRequestException {
    constructor() {
        super('DAILY_WITHDRAWAL_LIMIT_REACHED');
    }
}
exports.DailyWithdrawalLimitReachedException = DailyWithdrawalLimitReachedException;
//# sourceMappingURL=daily-withdrawal-limit-reached.exception.js.map