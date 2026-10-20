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
exports.InAppNotificationsService = exports.NOTIFICATION_ADDED = void 0;
const common_1 = require("@nestjs/common");
const in_app_notification_not_found_exception_1 = require("../exceptions/in-app-notification-not-found.exception");
const realtime_service_1 = require("../../infrastructure/pubsub/realtime.service");
exports.NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';
let InAppNotificationsService = class InAppNotificationsService {
    notificationRepository;
    realtimeService;
    constructor(notificationRepository, realtimeService) {
        this.notificationRepository = notificationRepository;
        this.realtimeService = realtimeService;
    }
    async create(dto, session) {
        const notification = await this.notificationRepository.create(dto, session);
        if (session && session.inTransaction()) {
            const originalCommit = session.commitTransaction.bind(session);
            const mutableSession = session;
            mutableSession.commitTransaction = async () => {
                await originalCommit();
                void this.realtimeService.publishNotificationAdded(notification);
            };
        }
        else {
            void this.realtimeService.publishNotificationAdded(notification);
        }
        return notification;
    }
    async getMyNotifications(userId, pagination, filter) {
        const { page, limit } = pagination;
        const [items, total] = await Promise.all([
            this.notificationRepository.findByUserId(userId, page, limit, filter),
            this.notificationRepository.countByUserId(userId, filter),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
    async getUnreadCount(userId, category) {
        return await this.notificationRepository.countUnread(userId, category);
    }
    async markAsRead(notificationId, userId, session) {
        const updated = await this.notificationRepository.markAsRead(notificationId, userId, session);
        if (!updated) {
            throw new in_app_notification_not_found_exception_1.InAppNotificationNotFoundException();
        }
        const publishReadStatus = async () => {
            const unreadCount = await this.notificationRepository.countUnread(userId);
            void this.realtimeService.publishNotificationReadStatusUpdated(userId, {
                notificationId: updated._id.toString(),
                unreadCount,
                category: updated.category,
            });
        };
        if (session && session.inTransaction()) {
            const originalCommit = session.commitTransaction.bind(session);
            const mutableSession = session;
            mutableSession.commitTransaction = async () => {
                await originalCommit();
                void publishReadStatus();
            };
        }
        else {
            void publishReadStatus();
        }
        return updated;
    }
    async markAllAsRead(userId, session) {
        await this.notificationRepository.markAllAsRead(userId, session);
        const publishAllRead = () => {
            void this.realtimeService.publishNotificationReadStatusUpdated(userId, {
                notificationId: null,
                unreadCount: 0,
                category: null,
            });
        };
        if (session && session.inTransaction()) {
            const originalCommit = session.commitTransaction.bind(session);
            const mutableSession = session;
            mutableSession.commitTransaction = async () => {
                await originalCommit();
                publishAllRead();
            };
        }
        else {
            publishAllRead();
        }
    }
};
exports.InAppNotificationsService = InAppNotificationsService;
exports.InAppNotificationsService = InAppNotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IInAppNotificationRepository')),
    __metadata("design:paramtypes", [Object, realtime_service_1.RealtimeService])
], InAppNotificationsService);
//# sourceMappingURL=in-app-notifications.service.js.map