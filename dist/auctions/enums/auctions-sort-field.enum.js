"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionsSortField = void 0;
const graphql_1 = require("@nestjs/graphql");
var AuctionsSortField;
(function (AuctionsSortField) {
    AuctionsSortField["CREATED_AT"] = "createdAt";
    AuctionsSortField["START_TIME"] = "startTime";
    AuctionsSortField["END_TIME"] = "endTime";
    AuctionsSortField["CURRENT_PRICE"] = "currentPrice";
    AuctionsSortField["TITLE"] = "title";
})(AuctionsSortField || (exports.AuctionsSortField = AuctionsSortField = {}));
(0, graphql_1.registerEnumType)(AuctionsSortField, {
    name: 'AuctionsSortField',
    description: 'Fields by which auctions can be sorted',
});
//# sourceMappingURL=auctions-sort-field.enum.js.map