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
exports.ChatRoomUpdatedPayload = void 0;
const graphql_1 = require("@nestjs/graphql");
const chat_message_entity_1 = require("../entities/chat-message.entity");
let ChatRoomUpdatedPayload = class ChatRoomUpdatedPayload {
    auctionId;
    unreadCount;
    totalUnreadRooms;
    lastMessageAt;
    lastMessage;
};
exports.ChatRoomUpdatedPayload = ChatRoomUpdatedPayload;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], ChatRoomUpdatedPayload.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ChatRoomUpdatedPayload.prototype, "unreadCount", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ChatRoomUpdatedPayload.prototype, "totalUnreadRooms", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date),
    __metadata("design:type", Date)
], ChatRoomUpdatedPayload.prototype, "lastMessageAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => chat_message_entity_1.ChatMessage),
    __metadata("design:type", chat_message_entity_1.ChatMessage)
], ChatRoomUpdatedPayload.prototype, "lastMessage", void 0);
exports.ChatRoomUpdatedPayload = ChatRoomUpdatedPayload = __decorate([
    (0, graphql_1.ObjectType)()
], ChatRoomUpdatedPayload);
//# sourceMappingURL=chat-room-updated.payload.js.map