"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatNotAllowedException = void 0;
const common_1 = require("@nestjs/common");
class ChatNotAllowedException extends common_1.BadRequestException {
    constructor() {
        super('CHAT_NOT_ALLOWED');
    }
}
exports.ChatNotAllowedException = ChatNotAllowedException;
//# sourceMappingURL=chat-not-allowed.exception.js.map