"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppNotificationType = void 0;
const graphql_1 = require("@nestjs/graphql");
var InAppNotificationType;
(function (InAppNotificationType) {
    InAppNotificationType["OUTBID"] = "OUTBID";
    InAppNotificationType["AUCTION_WON"] = "AUCTION_WON";
    InAppNotificationType["AUCTION_ENDED_SELLER"] = "AUCTION_ENDED_SELLER";
    InAppNotificationType["DEPOSIT_SUCCESSFUL"] = "DEPOSIT_SUCCESSFUL";
    InAppNotificationType["WITHDRAWAL_COMPLETED"] = "WITHDRAWAL_COMPLETED";
    InAppNotificationType["WITHDRAWAL_REQUESTED"] = "WITHDRAWAL_REQUESTED";
    InAppNotificationType["WITHDRAWAL_REJECTED"] = "WITHDRAWAL_REJECTED";
    InAppNotificationType["AUCTION_STARTED"] = "AUCTION_STARTED";
    InAppNotificationType["WELCOME"] = "WELCOME";
    InAppNotificationType["NEW_BID"] = "NEW_BID";
    InAppNotificationType["AUCTION_CANCELLED"] = "AUCTION_CANCELLED";
    InAppNotificationType["AUCTION_CANCELLED_BY_ADMIN"] = "AUCTION_CANCELLED_BY_ADMIN";
    InAppNotificationType["NEW_CHAT_MESSAGE"] = "NEW_CHAT_MESSAGE";
    InAppNotificationType["REVIEW_RECEIVED"] = "REVIEW_RECEIVED";
    InAppNotificationType["REVIEW_REPLIED"] = "REVIEW_REPLIED";
    InAppNotificationType["AUTO_BID_PLACED"] = "AUTO_BID_PLACED";
    InAppNotificationType["AUTO_BID_EXHAUSTED"] = "AUTO_BID_EXHAUSTED";
    InAppNotificationType["ESCROW_CREATED"] = "ESCROW_CREATED";
    InAppNotificationType["ESCROW_RELEASED"] = "ESCROW_RELEASED";
    InAppNotificationType["ESCROW_REFUNDED"] = "ESCROW_REFUNDED";
    InAppNotificationType["DISPUTE_OPENED"] = "DISPUTE_OPENED";
    InAppNotificationType["DISPUTE_RESOLVED"] = "DISPUTE_RESOLVED";
    InAppNotificationType["DISPUTE_CANCELLED"] = "DISPUTE_CANCELLED";
})(InAppNotificationType || (exports.InAppNotificationType = InAppNotificationType = {}));
(0, graphql_1.registerEnumType)(InAppNotificationType, {
    name: 'InAppNotificationType',
});
//# sourceMappingURL=in-app-notification-type.enum.js.map