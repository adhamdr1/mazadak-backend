"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var BidStatus;
(function (BidStatus) {
    BidStatus["WINNING"] = "WINNING";
    BidStatus["OUTBID"] = "OUTBID";
})(BidStatus || (exports.BidStatus = BidStatus = {}));
(0, graphql_1.registerEnumType)(BidStatus, {
    name: 'BidStatus',
});
//# sourceMappingURL=bid-status.enum.js.map