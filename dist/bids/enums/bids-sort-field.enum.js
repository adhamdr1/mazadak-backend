"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidsSortField = void 0;
const graphql_1 = require("@nestjs/graphql");
var BidsSortField;
(function (BidsSortField) {
    BidsSortField["CREATED_AT"] = "createdAt";
    BidsSortField["AMOUNT"] = "amount";
})(BidsSortField || (exports.BidsSortField = BidsSortField = {}));
(0, graphql_1.registerEnumType)(BidsSortField, {
    name: 'BidsSortField',
    description: 'Fields by which bids can be sorted',
});
//# sourceMappingURL=bids-sort-field.enum.js.map