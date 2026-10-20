"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageType = void 0;
const graphql_1 = require("@nestjs/graphql");
var ChatMessageType;
(function (ChatMessageType) {
    ChatMessageType["TEXT"] = "TEXT";
    ChatMessageType["IMAGE"] = "IMAGE";
})(ChatMessageType || (exports.ChatMessageType = ChatMessageType = {}));
(0, graphql_1.registerEnumType)(ChatMessageType, {
    name: 'ChatMessageType',
});
//# sourceMappingURL=chat-message-type.enum.js.map