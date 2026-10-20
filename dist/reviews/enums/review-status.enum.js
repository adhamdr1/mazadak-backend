"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewStatus = void 0;
const graphql_1 = require("@nestjs/graphql");
var ReviewStatus;
(function (ReviewStatus) {
    ReviewStatus["PENDING"] = "PENDING";
    ReviewStatus["PUBLISHED"] = "PUBLISHED";
    ReviewStatus["HIDDEN"] = "HIDDEN";
})(ReviewStatus || (exports.ReviewStatus = ReviewStatus = {}));
(0, graphql_1.registerEnumType)(ReviewStatus, {
    name: 'ReviewStatus',
    description: 'Publication and moderation status of a review',
});
//# sourceMappingURL=review-status.enum.js.map