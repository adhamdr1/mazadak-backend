"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatForbiddenException = void 0;
const common_1 = require("@nestjs/common");
class ChatForbiddenException extends common_1.ForbiddenException {
    constructor() {
        super('CHAT_FORBIDDEN');
    }
}
exports.ChatForbiddenException = ChatForbiddenException;
//# sourceMappingURL=chat-forbidden.exception.js.map