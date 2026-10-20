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
exports.ChatMessageSchema = exports.ChatMessage = exports.ChatReaction = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const chat_message_type_enum_1 = require("../enums/chat-message-type.enum");
let ChatReaction = class ChatReaction {
    emoji;
    userId;
};
exports.ChatReaction = ChatReaction;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], ChatReaction.prototype, "emoji", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatReaction.prototype, "userId", void 0);
exports.ChatReaction = ChatReaction = __decorate([
    (0, graphql_1.ObjectType)()
], ChatReaction);
let ChatMessage = class ChatMessage {
    _id;
    clientMessageId;
    auctionId;
    senderId;
    type;
    content;
    mediaUrls;
    reactions;
    isEdited;
    isDeleted;
    senderName;
    createdAt;
};
exports.ChatMessage = ChatMessage;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatMessage.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "clientMessageId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Auction', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatMessage.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatMessage.prototype, "senderId", void 0);
__decorate([
    (0, graphql_1.Field)(() => chat_message_type_enum_1.ChatMessageType),
    (0, mongoose_1.Prop)({
        type: String,
        enum: chat_message_type_enum_1.ChatMessageType,
        default: chat_message_type_enum_1.ChatMessageType.TEXT,
    }),
    __metadata("design:type", String)
], ChatMessage.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, mongoose_1.Prop)({ trim: true, default: null }),
    __metadata("design:type", String)
], ChatMessage.prototype, "content", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String], { nullable: true }),
    (0, mongoose_1.Prop)({ type: [String], default: null }),
    __metadata("design:type", Array)
], ChatMessage.prototype, "mediaUrls", void 0);
__decorate([
    (0, graphql_1.Field)(() => [ChatReaction]),
    (0, mongoose_1.Prop)({
        type: [
            {
                emoji: { type: String, required: true },
                userId: { type: mongoose_2.Types.ObjectId, ref: 'User', required: true },
            },
        ],
        default: [],
    }),
    __metadata("design:type", Array)
], ChatMessage.prototype, "reactions", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean),
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "isEdited", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean),
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "isDeleted", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "senderName", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], ChatMessage.prototype, "createdAt", void 0);
exports.ChatMessage = ChatMessage = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], ChatMessage);
exports.ChatMessageSchema = mongoose_1.SchemaFactory.createForClass(ChatMessage);
exports.ChatMessageSchema.index({ auctionId: 1, senderId: 1, clientMessageId: 1 }, { unique: true });
exports.ChatMessageSchema.index({ auctionId: 1, createdAt: -1, _id: -1 });
//# sourceMappingURL=chat-message.entity.js.map