"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationReferenceType = void 0;
const graphql_1 = require("@nestjs/graphql");
var NotificationReferenceType;
(function (NotificationReferenceType) {
    NotificationReferenceType["AUCTION"] = "AUCTION";
    NotificationReferenceType["TRANSACTION"] = "TRANSACTION";
    NotificationReferenceType["WALLET"] = "WALLET";
    NotificationReferenceType["REVIEW"] = "REVIEW";
    NotificationReferenceType["ESCROW"] = "ESCROW";
    NotificationReferenceType["DISPUTE"] = "DISPUTE";
    NotificationReferenceType["WITHDRAWAL"] = "WITHDRAWAL";
})(NotificationReferenceType || (exports.NotificationReferenceType = NotificationReferenceType = {}));
(0, graphql_1.registerEnumType)(NotificationReferenceType, {
    name: 'NotificationReferenceType',
});
//# sourceMappingURL=notification-reference-type.enum.js.map