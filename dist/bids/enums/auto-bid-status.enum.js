"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoBidStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var AutoBidStatus;
(function (AutoBidStatus) {
    AutoBidStatus["ACTIVE"] = "ACTIVE";
    AutoBidStatus["EXHAUSTED"] = "EXHAUSTED";
    AutoBidStatus["CANCELLED"] = "CANCELLED";
})(AutoBidStatus || (exports.AutoBidStatus = AutoBidStatus = {}));
(0, graphql_1.registerEnumType)(AutoBidStatus, {
    name: 'AutoBidStatus',
    description: 'The status of an auto-bid configuration (ACTIVE, EXHAUSTED, CANCELLED)',
});
//# sourceMappingURL=auto-bid-status.enum.js.map