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
exports.MongoInAppNotificationRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const in_app_notification_entity_1 = require("../entities/in-app-notification.entity");
const notification_category_helper_1 = require("../helpers/notification-category.helper");
const sort_order_enum_1 = require("../../../common/enums/sort-order.enum");
let MongoInAppNotificationRepository = class MongoInAppNotificationRepository {
    notificationModel;
    constructor(notificationModel) {
        this.notificationModel = notificationModel;
    }
    async startSession() {
        return await this.notificationModel.db.startSession();
    }
    async create(data, session) {
        const category = data.category ?? (0, notification_category_helper_1.getCategoryForNotificationType)(data.type);
        const created = new this.notificationModel({
            ...data,
            category,
        });
        return await created.save({ session });
    }
    async findByUserId(userId, page, limit, filter) {
        const query = this.buildFilterQuery(userId, filter);
        const sortDirection = filter?.sortOrder === sort_order_enum_1.SortOrder.ASC ? 1 : -1;
        const skip = (page - 1) * limit;
        return await this.notificationModel
            .find(query)
            .sort({ createdAt: sortDirection })
            .skip(skip)
            .limit(limit)
            .exec();
    }
    async countByUserId(userId, filter) {
        const query = this.buildFilterQuery(userId, filter);
        return await this.notificationModel.countDocuments(query).exec();
    }
    async countUnread(userId, category) {
        const query = {
            userId,
            isRead: false,
        };
        if (category) {
            query.category = category;
        }
        return await this.notificationModel.countDocuments(query).exec();
    }
    async markAsRead(notificationId, userId, session) {
        return await this.notificationModel
            .findOneAndUpdate({ _id: notificationId, userId }, { isRead: true }, { returnDocument: 'after', session })
            .exec();
    }
    async markAllAsRead(userId, session) {
        await this.notificationModel
            .updateMany({ userId, isRead: false }, { isRead: true }, { session })
            .exec();
    }
    buildFilterQuery(userId, filter) {
        const query = { userId };
        if (!filter)
            return query;
        if (filter.isRead !== undefined) {
            query.isRead = filter.isRead;
        }
        if (filter.category) {
            query.category = filter.category;
        }
        if (filter.types && filter.types.length > 0) {
            query.type = { $in: filter.types };
        }
        return query;
    }
};
exports.MongoInAppNotificationRepository = MongoInAppNotificationRepository;
exports.MongoInAppNotificationRepository = MongoInAppNotificationRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(in_app_notification_entity_1.InAppNotification.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MongoInAppNotificationRepository);
//# sourceMappingURL=mongo.in-app-notification.repository.js.map