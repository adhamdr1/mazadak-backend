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
exports.ChatReadStateSchema = exports.ChatReadState = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ChatReadState = class ChatReadState {
    _id;
    auctionId;
    userId;
    lastReadMessageId;
    lastReadAt;
};
exports.ChatReadState = ChatReadState;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatReadState.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Auction', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatReadState.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatReadState.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'ChatMessage', default: null }),
    __metadata("design:type", Object)
], ChatReadState.prototype, "lastReadMessageId", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date, { nullable: true }),
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], ChatReadState.prototype, "lastReadAt", void 0);
exports.ChatReadState = ChatReadState = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: true,
        versionKey: false,
        toJSON: { getters: true },
        toObject: { getters: true },
    })
], ChatReadState);
exports.ChatReadStateSchema = mongoose_1.SchemaFactory.createForClass(ChatReadState);
exports.ChatReadStateSchema.index({ auctionId: 1, userId: 1 }, { unique: true });
//# sourceMappingURL=chat-read-state.entity.js.map