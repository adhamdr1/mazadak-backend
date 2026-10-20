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
exports.NotificationsFilterInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const notification_category_enum_1 = require("../enums/notification-category.enum");
const in_app_notification_type_enum_1 = require("../enums/in-app-notification-type.enum");
const sort_order_enum_1 = require("../../../common/enums/sort-order.enum");
let NotificationsFilterInput = class NotificationsFilterInput {
    isRead;
    category;
    types;
    sortOrder = sort_order_enum_1.SortOrder.DESC;
};
exports.NotificationsFilterInput = NotificationsFilterInput;
__decorate([
    (0, graphql_1.Field)(() => Boolean, {
        nullable: true,
        description: 'Filter by read status (true for read, false for unread)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], NotificationsFilterInput.prototype, "isRead", void 0);
__decorate([
    (0, graphql_1.Field)(() => notification_category_enum_1.NotificationCategory, {
        nullable: true,
        description: 'Filter by category tab (AUCTIONS, FINANCIAL, ESCROW, SYSTEM)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(notification_category_enum_1.NotificationCategory),
    __metadata("design:type", String)
], NotificationsFilterInput.prototype, "category", void 0);
__decorate([
    (0, graphql_1.Field)(() => [in_app_notification_type_enum_1.InAppNotificationType], {
        nullable: true,
        description: 'Optional filter by specific notification types',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(in_app_notification_type_enum_1.InAppNotificationType, { each: true }),
    __metadata("design:type", Array)
], NotificationsFilterInput.prototype, "types", void 0);
__decorate([
    (0, graphql_1.Field)(() => sort_order_enum_1.SortOrder, {
        nullable: true,
        defaultValue: sort_order_enum_1.SortOrder.DESC,
        description: 'Sort order by creation time (DESC: newest first, ASC: oldest first)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(sort_order_enum_1.SortOrder),
    __metadata("design:type", String)
], NotificationsFilterInput.prototype, "sortOrder", void 0);
exports.NotificationsFilterInput = NotificationsFilterInput = __decorate([
    (0, graphql_1.InputType)()
], NotificationsFilterInput);
//# sourceMappingURL=notifications-filter.input.js.map