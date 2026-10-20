"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessagesConnection = void 0;
const graphql_1 = require("@nestjs/graphql");
const chat_message_entity_1 = require("../entities/chat-message.entity");
let ChatMessagesConnection = class ChatMessagesConnection {
    items;
    hasNextPage;
    endCursor;
};
exports.ChatMessagesConnection = ChatMessagesConnection;
__decorate([
    (0, graphql_1.Field)(() => [chat_message_entity_1.ChatMessage]),
    __metadata("design:type", Array)
], ChatMessagesConnection.prototype, "items", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean),
    __metadata("design:type", Boolean)
], ChatMessagesConnection.prototype, "hasNextPage", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    __metadata("design:type", Object)
], ChatMessagesConnection.prototype, "endCursor", void 0);
exports.ChatMessagesConnection = ChatMessagesConnection = __decorate([
    (0, graphql_1.ObjectType)()
], ChatMessagesConnection);
//# sourceMappingURL=chat-messages-connection.type.js.map