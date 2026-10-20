"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationFailedException = void 0;
const common_1 = require("@nestjs/common");
class NotificationFailedException extends common_1.InternalServerErrorException {
    constructor(reason, error) {
        super(`Failed to send notification: ${reason}`, { cause: error });
    }
}
exports.NotificationFailedException = NotificationFailedException;
//# sourceMappingURL=notification-failed.exception.js.map