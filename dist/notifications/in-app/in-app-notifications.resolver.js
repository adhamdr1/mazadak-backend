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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppNotificationsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const in_app_notifications_service_1 = require("./in-app-notifications.service");
const events_constants_1 = require("../../infrastructure/pubsub/events.constants");
const in_app_notification_entity_1 = require("./entities/in-app-notification.entity");
const in_app_notifications_page_type_1 = require("./dto/in-app-notifications-page.type");
const notifications_filter_input_1 = require("./dto/notifications-filter.input");
const notification_category_enum_1 = require("./enums/notification-category.enum");
const notification_read_payload_1 = require("./dto/notification-read.payload");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const pagination_input_1 = require("../../common/dto/pagination.input");
const pubsub_provider_1 = require("../../infrastructure/pubsub/pubsub.provider");
let InAppNotificationsResolver = class InAppNotificationsResolver {
    inAppNotificationsService;
    pubSub;
    constructor(inAppNotificationsService, pubSub) {
        this.inAppNotificationsService = inAppNotificationsService;
        this.pubSub = pubSub;
    }
    async getMyNotifications(currentUser, pagination, filter) {
        return await this.inAppNotificationsService.getMyNotifications(currentUser.sub, pagination, filter);
    }
    async getUnreadNotificationsCount(currentUser, category) {
        return await this.inAppNotificationsService.getUnreadCount(currentUser.sub, category);
    }
    async markNotificationAsRead(currentUser, notificationId) {
        return await this.inAppNotificationsService.markAsRead(notificationId, currentUser.sub);
    }
    async markAllNotificationsAsRead(currentUser) {
        await this.inAppNotificationsService.markAllAsRead(currentUser.sub);
        return true;
    }
    notificationAdded(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required to subscribe to notifications');
        }
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.NOTIFICATION_ADDED);
    }
    notificationReadStatusUpdated(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required to subscribe to notification read updates');
        }
        return this.pubSub.asyncIterableIterator(events_constants_1.PUB_SUB_EVENTS.NOTIFICATION_READ_STATUS_UPDATED);
    }
};
exports.InAppNotificationsResolver = InAppNotificationsResolver;
__decorate([
    (0, graphql_1.Query)(() => in_app_notifications_page_type_1.InAppNotificationsPage, { name: 'myNotifications' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('input')),
    __param(2, (0, graphql_1.Args)('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_input_1.PaginationInput,
        notifications_filter_input_1.NotificationsFilterInput]),
    __metadata("design:returntype", Promise)
], InAppNotificationsResolver.prototype, "getMyNotifications", null);
__decorate([
    (0, graphql_1.Query)(() => graphql_1.Int, { name: 'unreadNotificationsCount' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('category', {
        type: () => notification_category_enum_1.NotificationCategory,
        nullable: true,
        description: 'Optional category to get unread count specifically for that category tab',
    })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InAppNotificationsResolver.prototype, "getUnreadNotificationsCount", null);
__decorate([
    (0, graphql_1.Mutation)(() => in_app_notification_entity_1.InAppNotification, { name: 'markNotificationAsRead' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('notificationId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InAppNotificationsResolver.prototype, "markNotificationAsRead", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean, { name: 'markAllNotificationsAsRead' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InAppNotificationsResolver.prototype, "markAllNotificationsAsRead", null);
__decorate([
    (0, graphql_1.Subscription)(() => in_app_notification_entity_1.InAppNotification, {
        name: 'notificationAdded',
        filter: (payload, _variables, context) => {
            if (!context.user)
                return false;
            return payload.notificationAdded.userId.toString() === context.user.sub;
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InAppNotificationsResolver.prototype, "notificationAdded", null);
__decorate([
    (0, graphql_1.Subscription)(() => notification_read_payload_1.NotificationReadPayload, {
        name: 'notificationReadStatusUpdated',
        filter: (payload, _variables, context) => {
            if (!context.user)
                return false;
            return payload.userId === context.user.sub;
        },
        resolve: (payload) => payload.notificationReadStatusUpdated,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InAppNotificationsResolver.prototype, "notificationReadStatusUpdated", null);
exports.InAppNotificationsResolver = InAppNotificationsResolver = __decorate([
    (0, graphql_1.Resolver)(() => in_app_notification_entity_1.InAppNotification),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(1, (0, common_1.Inject)(pubsub_provider_1.PUB_SUB)),
    __metadata("design:paramtypes", [in_app_notifications_service_1.InAppNotificationsService, Function])
], InAppNotificationsResolver);
//# sourceMappingURL=in-app-notifications.resolver.js.map