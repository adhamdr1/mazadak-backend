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
exports.CreateChatMessageInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const chat_message_type_enum_1 = require("../enums/chat-message-type.enum");
let CreateChatMessageInput = class CreateChatMessageInput {
    auctionId;
    content;
    type;
    mediaUrls;
    clientMessageId;
};
exports.CreateChatMessageInput = CreateChatMessageInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateChatMessageInput.prototype, "auctionId", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateChatMessageInput.prototype, "content", void 0);
__decorate([
    (0, graphql_1.Field)(() => chat_message_type_enum_1.ChatMessageType, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateChatMessageInput.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String], { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.ArrayMaxSize)(10),
    __metadata("design:type", Array)
], CreateChatMessageInput.prototype, "mediaUrls", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateChatMessageInput.prototype, "clientMessageId", void 0);
exports.CreateChatMessageInput = CreateChatMessageInput = __decorate([
    (0, graphql_1.InputType)()
], CreateChatMessageInput);
//# sourceMappingURL=create-chat-message.input.js.map