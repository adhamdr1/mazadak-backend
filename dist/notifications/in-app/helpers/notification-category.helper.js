"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryForNotificationType = getCategoryForNotificationType;
const in_app_notification_type_enum_1 = require("../enums/in-app-notification-type.enum");
const notification_category_enum_1 = require("../enums/notification-category.enum");
function getCategoryForNotificationType(type) {
    switch (type) {
        case in_app_notification_type_enum_1.InAppNotificationType.AUCTION_STARTED:
        case in_app_notification_type_enum_1.InAppNotificationType.NEW_BID:
        case in_app_notification_type_enum_1.InAppNotificationType.OUTBID:
        case in_app_notification_type_enum_1.InAppNotificationType.AUTO_BID_PLACED:
        case in_app_notification_type_enum_1.InAppNotificationType.AUTO_BID_EXHAUSTED:
        case in_app_notification_type_enum_1.InAppNotificationType.AUCTION_WON:
        case in_app_notification_type_enum_1.InAppNotificationType.AUCTION_ENDED_SELLER:
        case in_app_notification_type_enum_1.InAppNotificationType.AUCTION_CANCELLED:
        case in_app_notification_type_enum_1.InAppNotificationType.AUCTION_CANCELLED_BY_ADMIN:
            return notification_category_enum_1.NotificationCategory.AUCTIONS;
        case in_app_notification_type_enum_1.InAppNotificationType.DEPOSIT_SUCCESSFUL:
        case in_app_notification_type_enum_1.InAppNotificationType.WITHDRAWAL_REQUESTED:
        case in_app_notification_type_enum_1.InAppNotificationType.WITHDRAWAL_COMPLETED:
        case in_app_notification_type_enum_1.InAppNotificationType.WITHDRAWAL_REJECTED:
            return notification_category_enum_1.NotificationCategory.FINANCIAL;
        case in_app_notification_type_enum_1.InAppNotificationType.ESCROW_CREATED:
        case in_app_notification_type_enum_1.InAppNotificationType.ESCROW_RELEASED:
        case in_app_notification_type_enum_1.InAppNotificationType.ESCROW_REFUNDED:
        case in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_OPENED:
        case in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_RESOLVED:
        case in_app_notification_type_enum_1.InAppNotificationType.DISPUTE_CANCELLED:
            return notification_category_enum_1.NotificationCategory.ESCROW;
        case in_app_notification_type_enum_1.InAppNotificationType.WELCOME:
        case in_app_notification_type_enum_1.InAppNotificationType.NEW_CHAT_MESSAGE:
        case in_app_notification_type_enum_1.InAppNotificationType.REVIEW_RECEIVED:
        case in_app_notification_type_enum_1.InAppNotificationType.REVIEW_REPLIED:
        default:
            return notification_category_enum_1.NotificationCategory.SYSTEM;
    }
}
//# sourceMappingURL=notification-category.helper.js.map