"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsSortField = void 0;
const graphql_1 = require("@nestjs/graphql");
var ReviewsSortField;
(function (ReviewsSortField) {
    ReviewsSortField["CREATED_AT"] = "createdAt";
    ReviewsSortField["RATING"] = "overallRating";
})(ReviewsSortField || (exports.ReviewsSortField = ReviewsSortField = {}));
(0, graphql_1.registerEnumType)(ReviewsSortField, {
    name: 'ReviewsSortField',
    description: 'Available sorting fields for reviews listing',
});
//# sourceMappingURL=reviews-sort-field.enum.js.map