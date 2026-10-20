"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var AuctionStatus;
(function (AuctionStatus) {
    AuctionStatus["PENDING"] = "PENDING";
    AuctionStatus["ACTIVE"] = "ACTIVE";
    AuctionStatus["ENDED"] = "ENDED";
    AuctionStatus["CANCELLED"] = "CANCELLED";
})(AuctionStatus || (exports.AuctionStatus = AuctionStatus = {}));
(0, graphql_1.registerEnumType)(AuctionStatus, {
    name: 'AuctionStatus',
});
//# sourceMappingURL=auction-status.enum.js.map