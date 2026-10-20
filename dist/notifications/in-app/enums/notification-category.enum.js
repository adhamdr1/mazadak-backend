"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationCategory = void 0;
const graphql_1 = require("@nestjs/graphql");
var NotificationCategory;
(function (NotificationCategory) {
    NotificationCategory["AUCTIONS"] = "AUCTIONS";
    NotificationCategory["FINANCIAL"] = "FINANCIAL";
    NotificationCategory["ESCROW"] = "ESCROW";
    NotificationCategory["SYSTEM"] = "SYSTEM";
})(NotificationCategory || (exports.NotificationCategory = NotificationCategory = {}));
(0, graphql_1.registerEnumType)(NotificationCategory, {
    name: 'NotificationCategory',
    description: 'Main notification category grouping for in-app notifications',
});
//# sourceMappingURL=notification-category.enum.js.map