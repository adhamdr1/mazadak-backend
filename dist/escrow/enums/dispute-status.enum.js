"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "OPEN";
    DisputeStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    DisputeStatus["RESOLVED_BUYER_REFUNDED"] = "RESOLVED_BUYER_REFUNDED";
    DisputeStatus["RESOLVED_SELLER_PAID"] = "RESOLVED_SELLER_PAID";
    DisputeStatus["CANCELLED"] = "CANCELLED";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
(0, graphql_1.registerEnumType)(DisputeStatus, {
    name: 'DisputeStatus',
    description: 'Lifecycle status of an escrow dispute',
});
//# sourceMappingURL=dispute-status.enum.js.map