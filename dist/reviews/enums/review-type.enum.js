"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewType = void 0;
const graphql_1 = require("@nestjs/graphql");
var ReviewType;
(function (ReviewType) {
    ReviewType["BUYER_TO_SELLER"] = "BUYER_TO_SELLER";
    ReviewType["SELLER_TO_BUYER"] = "SELLER_TO_BUYER";
})(ReviewType || (exports.ReviewType = ReviewType = {}));
(0, graphql_1.registerEnumType)(ReviewType, {
    name: 'ReviewType',
    description: 'Type of review submitted (buyer reviewing seller or seller reviewing buyer)',
});
//# sourceMappingURL=review-type.enum.js.map