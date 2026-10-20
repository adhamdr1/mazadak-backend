"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEditTimeoutException = void 0;
const common_1 = require("@nestjs/common");
class ChatEditTimeoutException extends common_1.BadRequestException {
    constructor() {
        super('CHAT_EDIT_TIMEOUT');
    }
}
exports.ChatEditTimeoutException = ChatEditTimeoutException;
//# sourceMappingURL=chat-edit-timeout.exception.js.map