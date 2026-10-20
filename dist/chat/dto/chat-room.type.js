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
exports.ChatRoom = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("mongoose");
const auction_entity_1 = require("../../auctions/entities/auction.entity");
const chat_message_entity_1 = require("../entities/chat-message.entity");
let ChatRoom = class ChatRoom {
    auctionId;
    auction;
    lastMessage;
    lastMessageAt;
    unreadCount;
};
exports.ChatRoom = ChatRoom;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_1.Types.ObjectId)
], ChatRoom.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => auction_entity_1.Auction),
    __metadata("design:type", auction_entity_1.Auction)
], ChatRoom.prototype, "auction", void 0);
__decorate([
    (0, graphql_1.Field)(() => chat_message_entity_1.ChatMessage, { nullable: true }),
    __metadata("design:type", Object)
], ChatRoom.prototype, "lastMessage", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date, { nullable: true }),
    __metadata("design:type", Object)
], ChatRoom.prototype, "lastMessageAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ChatRoom.prototype, "unreadCount", void 0);
exports.ChatRoom = ChatRoom = __decorate([
    (0, graphql_1.ObjectType)()
], ChatRoom);
//# sourceMappingURL=chat-room.type.js.map