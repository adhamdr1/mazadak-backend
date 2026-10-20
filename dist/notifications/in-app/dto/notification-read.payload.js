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
exports.NotificationReadPayload = void 0;
const graphql_1 = require("@nestjs/graphql");
const notification_category_enum_1 = require("../enums/notification-category.enum");
let NotificationReadPayload = class NotificationReadPayload {
    notificationId;
    unreadCount;
    category;
};
exports.NotificationReadPayload = NotificationReadPayload;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, {
        nullable: true,
        description: 'ID of the read notification, or null if markAllAsRead was called',
    }),
    __metadata("design:type", Object)
], NotificationReadPayload.prototype, "notificationId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, {
        description: 'Updated total unread notifications count for the authenticated user',
    }),
    __metadata("design:type", Number)
], NotificationReadPayload.prototype, "unreadCount", void 0);
__decorate([
    (0, graphql_1.Field)(() => notification_category_enum_1.NotificationCategory, {
        nullable: true,
        description: 'Category of the read notification, or null if markAllAsRead',
    }),
    __metadata("design:type", Object)
], NotificationReadPayload.prototype, "category", void 0);
exports.NotificationReadPayload = NotificationReadPayload = __decorate([
    (0, graphql_1.ObjectType)()
], NotificationReadPayload);
//# sourceMappingURL=notification-read.payload.js.map