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
exports.InAppNotificationSchema = exports.InAppNotification = void 0;
const graphql_1 = require("@nestjs/graphql");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const in_app_notification_type_enum_1 = require("../enums/in-app-notification-type.enum");
const notification_category_enum_1 = require("../enums/notification-category.enum");
const notification_reference_type_enum_1 = require("../enums/notification-reference-type.enum");
let InAppNotification = class InAppNotification {
    _id;
    userId;
    type;
    category;
    title;
    body;
    isRead;
    referenceId;
    referenceType;
    createdAt;
};
exports.InAppNotification = InAppNotification;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], InAppNotification.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], InAppNotification.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => in_app_notification_type_enum_1.InAppNotificationType),
    (0, mongoose_1.Prop)({
        type: String,
        enum: in_app_notification_type_enum_1.InAppNotificationType,
        required: true,
    }),
    __metadata("design:type", String)
], InAppNotification.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)(() => notification_category_enum_1.NotificationCategory),
    (0, mongoose_1.Prop)({
        type: String,
        enum: notification_category_enum_1.NotificationCategory,
        required: true,
        index: true,
    }),
    __metadata("design:type", String)
], InAppNotification.prototype, "category", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], InAppNotification.prototype, "title", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], InAppNotification.prototype, "body", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], InAppNotification.prototype, "isRead", void 0);
__decorate([
    (0, graphql_1.Field)(() => String, { nullable: true }),
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], InAppNotification.prototype, "referenceId", void 0);
__decorate([
    (0, graphql_1.Field)(() => notification_reference_type_enum_1.NotificationReferenceType, { nullable: true }),
    (0, mongoose_1.Prop)({
        type: String,
        enum: notification_reference_type_enum_1.NotificationReferenceType,
        default: null,
    }),
    __metadata("design:type", Object)
], InAppNotification.prototype, "referenceType", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], InAppNotification.prototype, "createdAt", void 0);
exports.InAppNotification = InAppNotification = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    })
], InAppNotification);
exports.InAppNotificationSchema = mongoose_1.SchemaFactory.createForClass(InAppNotification);
exports.InAppNotificationSchema.index({ userId: 1, createdAt: -1 });
exports.InAppNotificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
exports.InAppNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
exports.InAppNotificationSchema.index({
    userId: 1,
    category: 1,
    isRead: 1,
    createdAt: -1,
});
exports.InAppNotificationSchema.index({ userId: 1, isRead: 1, category: 1 });
//# sourceMappingURL=in-app-notification.entity.js.map