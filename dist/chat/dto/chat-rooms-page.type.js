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
exports.ChatRoomsPage = void 0;
const graphql_1 = require("@nestjs/graphql");
const chat_room_type_1 = require("./chat-room.type");
let ChatRoomsPage = class ChatRoomsPage {
    items;
    total;
    totalPages;
    hasNextPage;
};
exports.ChatRoomsPage = ChatRoomsPage;
__decorate([
    (0, graphql_1.Field)(() => [chat_room_type_1.ChatRoom]),
    __metadata("design:type", Array)
], ChatRoomsPage.prototype, "items", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ChatRoomsPage.prototype, "total", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ChatRoomsPage.prototype, "totalPages", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean),
    __metadata("design:type", Boolean)
], ChatRoomsPage.prototype, "hasNextPage", void 0);
exports.ChatRoomsPage = ChatRoomsPage = __decorate([
    (0, graphql_1.ObjectType)()
], ChatRoomsPage);
//# sourceMappingURL=chat-rooms-page.type.js.map