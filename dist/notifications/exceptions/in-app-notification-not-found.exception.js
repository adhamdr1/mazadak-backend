"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppNotificationNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class InAppNotificationNotFoundException extends common_1.NotFoundException {
    constructor() {
        super('IN_APP_NOTIFICATION_NOT_FOUND');
    }
}
exports.InAppNotificationNotFoundException = InAppNotificationNotFoundException;
//# sourceMappingURL=in-app-notification-not-found.exception.js.map