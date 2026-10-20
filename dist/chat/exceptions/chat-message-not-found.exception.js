"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class ChatMessageNotFoundException extends common_1.NotFoundException {
    constructor() {
        super('CHAT_MESSAGE_NOT_FOUND');
    }
}
exports.ChatMessageNotFoundException = ChatMessageNotFoundException;
//# sourceMappingURL=chat-message-not-found.exception.js.map