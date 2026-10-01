import { InAppNotificationType } from '../enums/in-app-notification-type.enum';
import { NotificationCategory } from '../enums/notification-category.enum';

export function getCategoryForNotificationType(
  type: InAppNotificationType,
): NotificationCategory {
  switch (type) {
    case InAppNotificationType.AUCTION_STARTED:
    case InAppNotificationType.NEW_BID:
    case InAppNotificationType.OUTBID:
    case InAppNotificationType.AUTO_BID_PLACED:
    case InAppNotificationType.AUTO_BID_EXHAUSTED:
    case InAppNotificationType.AUCTION_WON:
    case InAppNotificationType.AUCTION_ENDED_SELLER:
    case InAppNotificationType.AUCTION_CANCELLED:
    case InAppNotificationType.AUCTION_CANCELLED_BY_ADMIN:
      return NotificationCategory.AUCTIONS;

    case InAppNotificationType.DEPOSIT_SUCCESSFUL:
    case InAppNotificationType.WITHDRAWAL_REQUESTED:
    case InAppNotificationType.WITHDRAWAL_COMPLETED:
    case InAppNotificationType.WITHDRAWAL_REJECTED:
      return NotificationCategory.FINANCIAL;

    case InAppNotificationType.ESCROW_CREATED:
    case InAppNotificationType.ESCROW_RELEASED:
    case InAppNotificationType.ESCROW_REFUNDED:
    case InAppNotificationType.DISPUTE_OPENED:
    case InAppNotificationType.DISPUTE_RESOLVED:
    case InAppNotificationType.DISPUTE_CANCELLED:
      return NotificationCategory.ESCROW;

    case InAppNotificationType.WELCOME:
    case InAppNotificationType.NEW_CHAT_MESSAGE:
    case InAppNotificationType.REVIEW_RECEIVED:
    case InAppNotificationType.REVIEW_REPLIED:
    default:
      return NotificationCategory.SYSTEM;
  }
}
